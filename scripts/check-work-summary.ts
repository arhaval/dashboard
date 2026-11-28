/**
 * Kişisel iş özetinin (src/lib/work-summary.ts) deterministik doğrulaması.
 *
 *   pnpm exec tsx scripts/check-work-summary.ts
 *
 * Veritabanına dokunmaz. Kritik olanlar: ücreti tanımsız taslak ayrı sayılmalı
 * (sessiz ₺0 olmasın), Arhaval işleri dış ortak işlerinden ayrılmalı ve
 * müşteri bölmesinde Arhaval hep önce gelmeli.
 */

import { summarizeWork, splitByClient, clientLabelOf, isExternalWork } from '../src/lib/work-summary';
import type { WorkItem } from '../src/types';

let passed = 0;
const failures: string[] = [];
function eq(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed += 1;
  else failures.push(`${name} — beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`);
}

const ARHAVAL = { id: 'a', name: 'Arhaval', is_internal: true };
const SANGAL = { id: 's', name: 'Sangal', is_internal: false };

function item(p: Partial<WorkItem>): WorkItem {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u',
    work_type: 'STREAM',
    status: 'DRAFT',
    work_date: '2026-11-10',
    cost: null,
    notes: null,
    match_name: 'Maç',
    duration_minutes: 90,
    content_name: null,
    content_length: null,
    client_id: null,
    bill_amount: null,
    map_count: null,
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
    ...p,
  } as WorkItem;
}

const items = [
  item({ status: 'DRAFT', cost: null, map_count: 2, client: ARHAVAL }),
  item({ status: 'DRAFT', cost: 300, map_count: 3, client: SANGAL }),
  item({ status: 'APPROVED', cost: 500, map_count: 2, client: ARHAVAL }),
  item({ status: 'PAID', cost: 1000, map_count: 1 }), // müşterisiz → Arhaval
];

const s = summarizeWork(items);
eq('toplam adet', s.count, 4);
eq('toplam harita', s.maps, 8);
eq('toplam tutar', s.total, 1800);
eq('taslak', s.draft, { count: 2, amount: 300, unpriced: 1 });
eq('ödeme bekliyor', s.approved, { count: 1, amount: 500 });
eq('ödendi', s.paid, { count: 1, amount: 1000 });

eq('müşterisiz iş Arhaval sayılır', clientLabelOf(items[3]), 'Arhaval');
eq('Sangal dış ortak', isExternalWork(items[1]), true);
eq('müşteri bölmesi (Arhaval önce)', splitByClient(items).map((c) => [c.label, c.amount]), [
  ['Arhaval', 1500],
  ['Sangal', 300],
]);
eq('boş liste', summarizeWork([]).count, 0);

if (failures.length) {
  console.error(`✗ ${failures.length} hata, ${passed} geçti\n` + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${passed} kontrol geçti`);
