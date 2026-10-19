/**
 * Ana sayfadaki "Bugün" şeridinin deterministik doğrulaması.
 *
 *   pnpm exec tsx scripts/check-today-panel.ts
 *
 * Veritabanına dokunmaz. Bu şerit yanlış sayarsa iki kötü sonuçtan biri olur:
 * ya olmayan işi gösterir (güven gider), ya takılan işi hiç göstermez (işin
 * takıldığını kimse görmez). İkisi de ekranda hata gibi durmaz.
 */

import { buildTodaySignals, STUCK_AFTER_DAYS } from '../src/app/(dashboard)/today.constants';
import type { ContentQueueItem } from '../src/app/(dashboard)/icerik-plani/content-queue.constants';
import type { WorkItem } from '../src/types';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) { passed += 1; return; }
  failures.push(detail === undefined ? name : `${name} — beklenmeyen: ${JSON.stringify(detail)}`);
}
function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? undefined : { actual, expected });
}

const NOW = new Date('2026-10-20T12:00:00Z');

/** Gün sayısı kadar önce hareket etmiş bir içerik kartı. */
function card(over: Partial<ContentQueueItem> & { daysAgo?: number }): ContentQueueItem {
  const { daysAgo = 0, ...rest } = over;
  const updated = new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Kart',
    platforms: ['INSTAGRAM'],
    content_type: 'Short / Reels',
    status: 'HAZIRLANIYOR',
    content_text: 'metin',
    voice_url: null,
    video_url: null,
    has_text: true,
    has_voice: false,
    has_video: false,
    planned_date: null,
    published_date: null,
    notes: null,
    created_by: null,
    assigned_to: null,
    voiced_by: null,
    edited_by: null,
    created_at: updated,
    updated_at: updated,
    ...rest,
  };
}

function work(over: Partial<WorkItem>): WorkItem {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u1',
    work_type: 'VOICE',
    status: 'DRAFT',
    work_date: '2026-10-19',
    cost: null,
    notes: null,
    match_name: null,
    duration_minutes: null,
    content_name: 'İçerik',
    content_length: null,
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
    ...over,
  } as WorkItem;
}

function find(signals: ReturnType<typeof buildTodaySignals>, key: string) {
  return signals.find((s) => s.key === key) ?? null;
}

// ── 1. Hiçbir şey yoksa şerit boş ───────────────────────────────────────────

eq('iş de içerik de yoksa sinyal yok',
  buildTodaySignals({ workItems: [], content: [], now: NOW }), []);

// Yayınlanmış içerik ve ödenmiş iş sinyal üretmez — biten iş gündem değildir.
eq('yayınlanan içerik ve ödenen iş gündeme girmez',
  buildTodaySignals({
    workItems: [work({ status: 'PAID', cost: 100 })],
    content: [card({ status: 'YAYINLANDI', has_voice: true, has_video: true, daysAgo: 40 })],
    now: NOW,
  }), []);

// ── 2. Takılan içerik ───────────────────────────────────────────────────────

const fresh = buildTodaySignals({ workItems: [], content: [card({ daysAgo: 3 })], now: NOW });
eq('3 gündür bekleyen iş takılmış sayılmaz', find(fresh, 'STUCK'), null);
check('3 gündür bekleyen iş akışta görünür', find(fresh, 'VOICE')?.count === 1, fresh);

const atLimit = buildTodaySignals({ workItems: [], content: [card({ daysAgo: STUCK_AFTER_DAYS })], now: NOW });
eq(`${STUCK_AFTER_DAYS} gün sınırında takılmış sayılır`, find(atLimit, 'STUCK')?.count, 1);
eq('bir haftalık takılma sarı', find(atLimit, 'STUCK')?.tone, 'WARN');

const late = buildTodaySignals({ workItems: [], content: [card({ daysAgo: 20, title: 'Woxic masa' })], now: NOW });
eq('iki haftayı geçen takılma kırmızı', find(late, 'STUCK')?.tone, 'LATE');
check('takılan sinyali en uzun bekleyeni yazar',
  find(late, 'STUCK')?.detail?.includes('Woxic masa') === true, find(late, 'STUCK')?.detail);
check('takılan sinyali gün sayısını yazar',
  find(late, 'STUCK')?.detail?.includes('20 gün') === true, find(late, 'STUCK')?.detail);

// En uzun bekleyen seçilir, ilk bulunan değil.
const many = buildTodaySignals({
  workItems: [],
  content: [card({ daysAgo: 9, title: 'Kısa' }), card({ daysAgo: 30, title: 'Uzun' })],
  now: NOW,
});
eq('iki takılan iş sayılır', find(many, 'STUCK')?.count, 2);
check('en uzun bekleyen yazılır', find(many, 'STUCK')?.detail?.includes('Uzun') === true, find(many, 'STUCK')?.detail);

// ── 3. Aşamalar doğru kovaya düşer ──────────────────────────────────────────

const stages = buildTodaySignals({
  workItems: [],
  content: [
    card({ has_text: true }),                                       // SES
    card({ has_text: true, has_voice: true }),                      // EDITOR
    card({ has_text: true, has_voice: true, has_video: true }),      // HAZIR
  ],
  now: NOW,
});
eq('seslendirmede 1', find(stages, 'VOICE')?.count, 1);
eq('kurguda 1', find(stages, 'EDIT')?.count, 1);
eq('yayına hazır 1', find(stages, 'READY')?.count, 1);

// ── 4. İş kalemleri: onay ve ödeme ──────────────────────────────────────────

const money = buildTodaySignals({
  workItems: [
    work({ status: 'DRAFT', cost: null }),
    work({ status: 'DRAFT', cost: 0 }),
    work({ status: 'DRAFT', cost: 500 }),
    work({ status: 'APPROVED', cost: 1500 }),
    work({ status: 'APPROVED', cost: 2500 }),
    work({ status: 'PAID', cost: 9999 }),
  ],
  content: [],
  now: NOW,
});
eq('onay bekleyen 3 taslak', find(money, 'PRICING')?.count, 3);
check('fiyatı girilmemiş olanlar ayrıca söylenir',
  find(money, 'PRICING')?.detail?.includes('2') === true, find(money, 'PRICING')?.detail);
eq('ödenecek iş 2', find(money, 'PAYABLE')?.count, 2);
check('ödenecek toplam yazılır',
  find(money, 'PAYABLE')?.detail?.includes('4.000') === true, find(money, 'PAYABLE')?.detail);
// Ödenmiş iş ikisine de karışmaz.
check('ödenen iş sayılmaz',
  find(money, 'PRICING')?.count === 3 && find(money, 'PAYABLE')?.count === 2, money);

// ── 5. Sıra: takılanlar en başta ────────────────────────────────────────────

const ordered = buildTodaySignals({
  workItems: [work({ status: 'APPROVED', cost: 100 }), work({ status: 'DRAFT' })],
  content: [card({ daysAgo: 30 }), card({ has_text: true, has_voice: true, has_video: true })],
  now: NOW,
});
eq('ilk sinyal takılan içerik', ordered[0]?.key, 'STUCK');
check('her sinyalin gidilecek yeri var', ordered.every((s) => s.href.startsWith('/')), ordered);
check('sıfır sayılı sinyal yok', ordered.every((s) => s.count > 0), ordered);

// ── Sonuç ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
