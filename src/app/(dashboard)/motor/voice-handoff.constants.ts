/**
 * Motor → İçerik Planı teslim köprüsü (saf eşleme katmanı).
 *
 * Final metin Motor'da onaylanır, seslendirme ise İçerik Planı hattında yürür:
 * Metin → Ses → Kurgu → Hazır → Yayınlandı. Hat çalışıyordu ama Motor'a bağlı
 * olmadığı için onaylanan metni seslendirmene ulaştırmak elle kart açıp metni
 * yeniden yapıştırmayı gerektiriyordu.
 *
 * Buradaki her şey saf: next/headers yok, veritabanı yok. Hem server action
 * hem client bileşen aynı dosyadan okur ki eşleme tek yerde kalsın.
 */

import { DEFAULT_PLATFORM, type EnginePlatform, type ScriptDTO } from './engine.constants';
import type { ContentPlatform } from '@/app/(dashboard)/icerik-plani/content-queue.constants';

/** Kartın açılacağı platform(lar) ve format adı. */
export interface VoiceHandoffTarget {
  platforms: ContentPlatform[];
  /** İçerik Planı'nın CONTENT_FORMATS listesinden bir değer. */
  contentType: string;
}

/**
 * Motor platformu → kart platformu + format.
 *
 * Motor "nerede yayınlanacak"ı üretim açısından tutar (REELS/SHORTS ayrı,
 * çünkü metin uzunluğu ve dil değişir); kart ise yayın platformunu tutar
 * (ikisi de ayrı platformlarda ama aynı format).
 */
export function handoffTargetFor(platform: EnginePlatform | null): VoiceHandoffTarget {
  switch (platform) {
    case 'REELS':        return { platforms: ['INSTAGRAM'], contentType: 'Short / Reels' };
    case 'SHORTS':       return { platforms: ['YOUTUBE'],   contentType: 'Short / Reels' };
    case 'TIKTOK':       return { platforms: ['TIKTOK'],    contentType: 'Short / Reels' };
    case 'YOUTUBE_LONG': return { platforms: ['YOUTUBE'],   contentType: 'Video' };
    case 'X':            return { platforms: ['X'],         contentType: 'Tweet / Thread' };
    // Platform seçilmemiş metin: kart en az bir platform ister, motorun kendi
    // varsayılanına düşer. Tek varsayılan olsun diye yeniden çağırıyoruz.
    default:             return handoffTargetFor(DEFAULT_PLATFORM);
  }
}

/**
 * Kartın not satırı — seslendirmen metni okumadan önce ne olduğunu görsün.
 * Kısa tutulur: format ve hedef süre, okuma hızını belirleyen iki bilgi.
 */
export function handoffNote(script: Pick<ScriptDTO, 'format_label' | 'target_duration'>): string {
  const parts = ['Motor'];
  if (script.format_label) parts.push(script.format_label);
  if (script.target_duration) parts.push(script.target_duration);
  return parts.join(' · ');
}

/**
 * "Seslendirme senden bekleniyor" bildirimi.
 *
 * İki yerden gönderilir: Motor'dan doğrudan teslimde ve İçerik Planı'nda
 * seslendirmen atandığında. Metin tek yerde dursun ki ikisi ayrışmasın.
 */
export function voiceRequestNotification(title: string): { title: string; body: string } {
  return {
    title: '🎙 Seslendirme senden bekleniyor',
    body: `Metin hazır. "${title}" için sesi kaydedip linkini yükle.`,
  };
}

/** Motor listesinde/detayında bir metnin teslim durumu. */
export type HandoffStage = 'SES' | 'EDITOR' | 'HAZIR' | 'YAYINLANDI';

export interface ScriptHandoff {
  cardId: string;
  stage: HandoffStage;
  /** Seslendirmen linki bıraktığında dolar — Motor'da doğrudan görünür. */
  voiceUrl: string | null;
  assigneeName: string | null;
}

export const HANDOFF_LABELS: Record<HandoffStage, string> = {
  SES:        'Seslendirmede',
  EDITOR:     'Ses hazır · kurguda',
  HAZIR:      'Video hazır',
  YAYINLANDI: 'Yayınlandı',
};
