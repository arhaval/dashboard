/**
 * Ana sayfanın "bugün ne var" şeridi — saf hesap katmanı.
 *
 * Ana sayfa bugüne kadar ayın özetini gösteriyordu: ciro, ödenen, içerik
 * sayısı. Doğru bilgiler ama hiçbiri "şimdi ne yapmam lazım" sorusunu
 * cevaplamıyor. Buradaki sinyaller o soruyu cevaplar: takılan iş, bekleyen
 * onay, ödenecek para. Hepsi bir yere tıklanır — görülen şey gidilecek yer.
 *
 * Saf tutuluyor ki sayılar deterministik sınanabilsin: bu şerit yanlış sayı
 * gösterirse güven kaybı, boş gösterirse işin takıldığını hiç görmemek olur.
 */

import {
  daysWaiting,
  deriveStage,
  staleLevel,
  type ContentQueueItem,
} from './icerik-plani/content-queue.constants';
import type { WorkItem } from '@/types';

/** Şeritte bir kutu. */
export interface TodaySignal {
  key: string;
  label: string;
  count: number;
  /** Kutunun altındaki açıklama — para toplamı, en uzun bekleme gibi. */
  detail: string | null;
  href: string;
  /** Renk tonu: geciken kırmızı, dikkat isteyen sarı, akan nötr. */
  tone: 'LATE' | 'WARN' | 'OK';
}

/** Kaç gün hareketsizlikten sonra iş "takılmış" sayılır. */
export const STUCK_AFTER_DAYS = 7;

function tl(amount: number): string {
  return `${amount.toLocaleString('tr-TR')} ₺`;
}

/**
 * Şeridi kurar. Sıfır olan sinyal gösterilmez — boş kutu bilgi değil gürültü.
 *
 * Sıra bilinçli: önce takılanlar (kimse ilgilenmiyor), sonra senden bir şey
 * bekleyenler (fiyatlama, ödeme, yayın), sonra akışta olanlar.
 */
export function buildTodaySignals(input: {
  workItems: WorkItem[];
  content: ContentQueueItem[];
  now?: Date;
}): TodaySignal[] {
  const now = input.now ?? new Date();
  const signals: TodaySignal[] = [];

  const open = input.content.filter((c) => deriveStage(c) !== 'YAYINLANDI');

  // ── Takılan içerik: bir haftadan uzun süre hareket etmemiş ───────────────
  const stuck = open
    .map((c) => ({ item: c, days: daysWaiting(c.updated_at, now) ?? 0 }))
    .filter((x) => x.days >= STUCK_AFTER_DAYS)
    .sort((a, b) => b.days - a.days);

  if (stuck.length > 0) {
    const worst = stuck[0];
    signals.push({
      key: 'STUCK',
      label: 'Takılan içerik',
      count: stuck.length,
      detail: `en uzunu ${worst.days} gün — ${worst.item.title}`,
      href: '/icerik-plani',
      tone: staleLevel(worst.days) === 'LATE' ? 'LATE' : 'WARN',
    });
  }

  // ── Senden bekleyenler ───────────────────────────────────────────────────
  // Fiyatı girilmemiş iş: ekip işi girdi, sen onaylayana kadar ödeme olmaz.
  const drafts = input.workItems.filter((w) => w.status === 'DRAFT');
  if (drafts.length > 0) {
    const unpriced = drafts.filter((w) => w.cost === null || w.cost === 0).length;
    signals.push({
      key: 'PRICING',
      label: 'Onay bekleyen iş',
      count: drafts.length,
      detail: unpriced > 0 ? `${unpriced} tanesinin fiyatı girilmemiş` : null,
      href: '/work-items',
      tone: 'WARN',
    });
  }

  // Onaylanmış ama ödenmemiş: ödeme ekranında seni bekliyor.
  const payable = input.workItems.filter((w) => w.status === 'APPROVED');
  if (payable.length > 0) {
    const total = payable.reduce((sum, w) => sum + (w.cost ?? 0), 0);
    signals.push({
      key: 'PAYABLE',
      label: 'Ödenecek iş',
      count: payable.length,
      detail: total > 0 ? tl(total) : null,
      href: '/payments',
      tone: 'OK',
    });
  }

  // Yayına hazır: video bitmiş, yayınlanmayı bekliyor.
  const ready = open.filter((c) => deriveStage(c) === 'HAZIR');
  if (ready.length > 0) {
    signals.push({
      key: 'READY',
      label: 'Yayına hazır',
      count: ready.length,
      detail: null,
      href: '/icerik-plani',
      tone: 'OK',
    });
  }

  // ── Akışta olanlar ───────────────────────────────────────────────────────
  const voicing = open.filter((c) => deriveStage(c) === 'SES');
  if (voicing.length > 0) {
    signals.push({
      key: 'VOICE',
      label: 'Seslendirmede',
      count: voicing.length,
      detail: null,
      href: '/icerik-plani',
      tone: 'OK',
    });
  }

  const editing = open.filter((c) => deriveStage(c) === 'EDITOR');
  if (editing.length > 0) {
    signals.push({
      key: 'EDIT',
      label: 'Kurguda',
      count: editing.length,
      detail: null,
      href: '/icerik-plani',
      tone: 'OK',
    });
  }

  return signals;
}
