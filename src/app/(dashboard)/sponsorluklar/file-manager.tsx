'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Package, Paperclip, Upload, Download, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  createSponsorFileUploadUrl,
  recordSponsorFile,
  deleteSponsorFile,
  getSignedUrl,
} from './actions';
import { CATEGORY_LABELS, type SponsorFile, type SponsorFileCategory } from './sponsor.constants';

type FileWithUrl = SponsorFile & { url: string | null };

const BUCKET = 'sponsors';

/** Trigger a real file download from a fresh, attachment-dispositioned URL. */
function triggerDownload(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const SECTIONS: { category: SponsorFileCategory; icon: typeof FileText; accept: string }[] = [
  { category: 'contract', icon: FileText, accept: '.pdf,.doc,.docx,image/*' },
  { category: 'logo_pack', icon: Package, accept: 'image/*,.zip,.rar,.ai,.svg,.pdf' },
  { category: 'other', icon: Paperclip, accept: '*' },
];

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Section({ sponsorId, category, icon: Icon, accept, files }: {
  sponsorId: string; category: SponsorFileCategory; icon: typeof FileText; accept: string; files: FileWithUrl[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      // 1) get a direct-upload URL (bypasses server-action body limits)
      const signed = await createSponsorFileUploadUrl(sponsorId, category, file.name);
      if (signed.error || !signed.path || !signed.token) {
        setError(signed.error ?? 'Yükleme adresi alınamadı');
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      // 2) upload the file straight to Supabase Storage from the browser
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || 'application/octet-stream',
        });
      if (upErr) {
        setError(upErr.message);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      // 3) record the DB row
      const rec = await recordSponsorFile(sponsorId, category, file.name, signed.path, file.size);
      if (rec.error) setError(rec.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  function handleDownload(f: FileWithUrl) {
    setError(null);
    startTransition(async () => {
      const res = await getSignedUrl(f.file_path, f.file_name);
      if (res.error || !res.url) setError(res.error ?? 'İndirilemedi');
      else triggerDownload(res.url, f.file_name);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Dosyayı sil?')) return;
    startTransition(async () => { await deleteSponsorFile(id, sponsorId); router.refresh(); });
  }

  return (
    <div className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{CATEGORY_LABELS[category]}</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({files.length})</span>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
          <Upload className="h-3.5 w-3.5" /> {isPending ? 'Yükleniyor…' : 'Yükle'}
        </button>
        <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="sr-only" />
      </div>

      {error && <p className="mb-2 text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}

      {files.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Henüz dosya yok.</p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <span className="flex-1 truncate text-xs" style={{ color: 'var(--color-text-primary)' }}>{f.file_name}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{formatSize(f.size_bytes)}</span>
              <button onClick={() => handleDownload(f)} disabled={isPending} className="rounded p-1 transition-colors hover:bg-black/5 disabled:opacity-50" title="İndir" style={{ color: 'var(--color-info)' }}>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(f.id)} disabled={isPending} className="rounded p-1 transition-colors hover:bg-red-500/10 disabled:opacity-50" title="Sil" style={{ color: 'var(--color-error)' }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FileManager({ sponsorId, files }: { sponsorId: string; files: FileWithUrl[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {SECTIONS.map((s) => (
        <Section key={s.category} sponsorId={sponsorId} category={s.category} icon={s.icon} accept={s.accept}
          files={files.filter((f) => f.category === s.category)} />
      ))}
    </div>
  );
}
