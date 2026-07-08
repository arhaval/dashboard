import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, CalendarDays, User, Banknote } from 'lucide-react';
import { userService } from '@/services';
import { sponsorService } from '@/services/sponsor.service';
import { STATUS_META } from '../sponsor.constants';
import { FileManager } from '../file-manager';
import { PaymentSchedule } from '../payment-schedule';

export const dynamic = 'force-dynamic';

function formatDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SponsorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const sponsor = await sponsorService.getById(id);
  if (!sponsor) notFound();

  const [logoUrl, files, payments] = await Promise.all([
    sponsorService.signedUrl(sponsor.logo_path),
    sponsorService.getFiles(id),
    sponsorService.getPayments(id),
  ]);
  const filesWithUrls = await Promise.all(
    files.map(async (f) => ({ ...f, url: await sponsorService.signedUrl(f.file_path) }))
  );

  const meta = STATUS_META[sponsor.status];

  return (
    <PageShell
      title={sponsor.name}
      description="Sponsor detayı, şartlar ve dosyalar"
      actions={
        <Link href="/sponsorluklar">
          <Button variant="secondary"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
        </Link>
      }
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-5 rounded-[var(--radius-md)] border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex h-24 w-40 items-center justify-center rounded-[var(--radius-sm)] p-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <Building2 className="h-10 w-10" style={{ color: 'var(--color-text-muted)' }} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{sponsor.name}</h2>
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} /> {formatDate(sponsor.start_date)} – {formatDate(sponsor.end_date)}</span>
            {sponsor.contact && <span className="flex items-center gap-1.5"><User className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} /> {sponsor.contact}</span>}
            {sponsor.deal_value != null && <span className="flex items-center gap-1.5"><Banknote className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} /> {sponsor.deal_value.toLocaleString('tr-TR')} ₺</span>}
          </div>
        </div>
      </div>

      {/* Terms */}
      {sponsor.terms && (
        <div className="mb-6 rounded-[var(--radius-md)] border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Şartlar / Anlaşma Detayları</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{sponsor.terms}</p>
        </div>
      )}
      {sponsor.notes && (
        <div className="mb-6 rounded-[var(--radius-md)] border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Not</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{sponsor.notes}</p>
        </div>
      )}

      {/* Payment schedule */}
      <PaymentSchedule sponsor={sponsor} payments={payments} />

      {/* Files */}
      <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Dosyalar</h3>
      <FileManager sponsorId={id} files={filesWithUrls} />
    </PageShell>
  );
}
