'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAGE_DEFS, EDITABLE_ROLES, ROLE_LABELS, type PageKey } from '@/constants/permissions';
import { saveRolePages } from './actions';

export function PermissionsMatrix({ matrix }: { matrix: Record<string, PageKey[]> }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, Set<PageKey>>>(() => {
    const s: Record<string, Set<PageKey>> = {};
    for (const role of EDITABLE_ROLES) s[role] = new Set(matrix[role] ?? []);
    return s;
  });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Group pages for readable section headers.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, typeof PAGE_DEFS>();
    for (const p of PAGE_DEFS) {
      if (!byGroup.has(p.group)) { byGroup.set(p.group, []); order.push(p.group); }
      byGroup.get(p.group)!.push(p);
    }
    return order.map((g) => ({ group: g, pages: byGroup.get(g)! }));
  }, []);

  function toggle(role: string, page: PageKey) {
    setMsg(null); setErr(null);
    setState((prev) => {
      const next = new Set(prev[role]);
      if (next.has(page)) next.delete(page); else next.add(page);
      return { ...prev, [role]: next };
    });
  }

  function save() {
    setMsg(null); setErr(null);
    start(async () => {
      for (const role of EDITABLE_ROLES) {
        const res = await saveRolePages(role, [...state[role]]);
        if (res.error) { setErr(`${ROLE_LABELS[role]}: ${res.error}`); return; }
      }
      setMsg('Yetkiler kaydedildi. Menü ve erişim anında güncellendi.');
      router.refresh();
    });
  }

  const cellBtn = (role: string, page: PageKey) => {
    const on = state[role].has(page);
    return (
      <button
        type="button"
        onClick={() => toggle(role, page)}
        disabled={pending}
        aria-pressed={on}
        className="mx-auto flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold transition-colors disabled:opacity-50"
        style={on
          ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
          : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
      >
        {on ? '✓' : ''}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          <Save className="mr-2 h-4 w-4" /> {pending ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
        </Button>
        {msg && <span className="text-sm" style={{ color: 'var(--color-success)' }}>{msg}</span>}
        {err && <span className="text-sm" style={{ color: 'var(--color-error)' }}>{err}</span>}
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)]" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full border-collapse text-sm" style={{ minWidth: 640 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Sayfa</th>
              {EDITABLE_ROLES.map((role) => (
                <th key={role} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{ROLE_LABELS[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ group, pages }) => (
              <FragmentRows key={group} group={group} pages={pages} cols={EDITABLE_ROLES.length} cellBtn={cellBtn} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Yönetici (ADMIN) tüm sayfalara her zaman erişir; bu yüzden tabloda yer almaz. Bir rolü tamamen kısıtlamak için tüm kutucukları kapatabilirsin (Ana Sayfa hariç önerilir).
      </p>
    </div>
  );
}

function FragmentRows({ group, pages, cols, cellBtn }: {
  group: string; pages: typeof PAGE_DEFS; cols: number; cellBtn: (role: string, page: PageKey) => ReactNode;
}) {
  return (
    <>
      <tr>
        <td colSpan={cols + 1} className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>{group}</td>
      </tr>
      {pages.map((p, i) => (
        <tr key={p.key} style={{ backgroundColor: i % 2 ? 'var(--color-table-row-even)' : 'transparent', borderBottom: '1px solid var(--color-border)' }}>
          <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.label}</td>
          {EDITABLE_ROLES.map((role) => (
            <td key={role} className="px-3 py-2.5 text-center">{cellBtn(role, p.key)}</td>
          ))}
        </tr>
      ))}
    </>
  );
}
