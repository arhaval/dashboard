/**
 * Sosyal Medya ekranlarının ortak görsel parçaları.
 *
 * TİPOGRAFİ SİSTEMİ — İçerik Performansı ekranlarında oturmuş sistemin aynısı,
 * iki modül farklı ürün gibi görünmesin diye:
 *   serif + tabular-nums → miktarlar (okunması gereken sayı)
 *   sans                 → dil (etiket, açıklama)
 *   mono + tabular-nums  → tablo değerleri (hizalanması gereken sayı)
 *
 * RENK DİSİPLİNİ — panelin dili siyah/turuncu. Platform renkleri yalnızca
 * küçük bir nokta olarak görünür; yedi ayrı dolgulu rozet bir tabloyu
 * gökkuşağına çeviriyordu.
 */

import type { MonthlyPlatform } from './social-monthly.constants';
import { MONTHLY_PLATFORM_LABELS } from './social-monthly.constants';

/** Platform başına TEK renk — yalnızca nokta/işaret için. */
export const PLATFORM_DOT: Record<MonthlyPlatform, string> = {
  INSTAGRAM: '#E1306C',
  YOUTUBE: '#FF0000',
  TIKTOK: '#25F4EE',
  X: '#E7E9EA',
  TWITCH: '#9146FF',
  KICK: '#53FC18',
  WEBSITE: '#A1A1A1',
};

/** Küçük başlık — büyük harf, seyrek harf aralığı. */
export function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase"
      style={{ color: 'var(--color-text-muted)', letterSpacing: '0.11em' }}
    >
      {children}
    </p>
  );
}

/**
 * Okunması gereken miktar. `size` ile ölçeklenir:
 *   lg → ekranın karar sayıları (KPI)
 *   sm → yardımcı sayılar
 */
export function Amount({
  children,
  size = 'lg',
  tone,
}: {
  children: React.ReactNode;
  size?: 'lg' | 'sm';
  tone?: string;
}) {
  return (
    <p
      className="leading-none"
      style={{
        color: tone ?? 'var(--color-text-primary)',
        fontFamily: 'var(--font-source-serif)',
        fontSize: size === 'lg' ? 'clamp(26px, 3.4vw, 34px)' : '17px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums lining-nums',
      }}
    >
      {children}
    </p>
  );
}

/** Tabloda hizalanması gereken sayı. */
export function Figure({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className="font-mono text-[12.5px]"
      style={{ color: tone ?? 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
    >
      {children}
    </span>
  );
}

/**
 * Platform işareti: renkli nokta + nötr metin.
 * Renk taşıyan tek eleman nokta; metin panelin kendi rengiyle kalır.
 */
export function PlatformTag({
  platform,
  muted,
  strong,
}: {
  platform: MonthlyPlatform;
  /** Seçili olmayan/geri planda duran hal. */
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ opacity: muted ? 0.5 : 1 }}>
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          backgroundColor: PLATFORM_DOT[platform],
          flexShrink: 0,
        }}
      />
      <span
        className="text-[12px]"
        style={{
          color: strong ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontWeight: strong ? 600 : 500,
          whiteSpace: 'nowrap',
        }}
      >
        {MONTHLY_PLATFORM_LABELS[platform]}
      </span>
    </span>
  );
}

/**
 * Bölüm başlığı + içerik. Çerçeve YOK: Genel Bakış'ta altı ayrı çerçeveli
 * kutu üst üste binince hiçbiri öne çıkmıyordu. Yalnızca KPI kartları kutulu
 * kalır; yardımcı bölümler ince bir çizgiyle ayrılır.
 */
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div
        className="mb-3 flex items-center justify-between gap-2 pb-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <MicroLabel>{title}</MicroLabel>
        {action}
      </div>
      {children}
    </section>
  );
}
