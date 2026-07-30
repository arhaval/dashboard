/**
 * ContentPerformanceRecommendationService
 *
 * Kural bazlı, DETERMINISTIK öneri motoru. Serbest metin üreten bir AI servisi
 * bağlanmaz: aynı girdi her zaman aynı çıktıyı verir, bu yüzden test edilebilir.
 *
 * Kurallar tek yerde ve sabit sırada değerlendirilir — UI component'larında
 * dağınık `if` blokları YOK. Tetiklenen her kuralın kodu çıktıda döner, böylece
 * bir önerinin neden çıktığı izlenebilir.
 *
 * Çıktı sözleşmesi (§10 / §11):
 *   - en fazla MAX_ACTIONS (3) aksiyon, farklı karar slotlarından
 *   - aynı ANLAMDAKİ aksiyonlar birleştirilir (ActionGroup)
 *   - her aksiyon `reason` ile gerekçesini taşır
 *
 * Kural haritası:
 *   R01  yayın kaydı yok                      R09  yüksek erişim / düşük etkileşim
 *   R02  planlanmış ama yayınlanmamış platform R10  düşük erişim / yüksek etkileşim
 *   R03  tek platform                          R11  kaydetme ağırlıklı
 *   R04  elle girilecek sayılar boş            R12  paylaşım ağırlıklı
 *   R05  karşılaştırılabilir skor yok          R13  takipçi kazanımı
 *   R06  platformlar arası ciddi fark          R14  yorum ağırlıklı
 *   R07  her yerde güçlü                       R15  eksik veri kapsamı
 *   R08  her yerde zayıf (etikete göre)        R16  API platformu senkronize değil
 *   R17  belirgin platform kazananı            R20  X güçlü / video zayıf
 *   R18  yeterli veriye sahip platformlar zayıf R21 Instagram paylaşım/kaydetme güçlü
 *   R19  çapraz platform başarısı
 */

import { PLATFORM_LABELS, type ContentPlatform } from '@/app/(dashboard)/icerik-plani/content-queue.constants';
import {
  engagementRate,
  fmtRatio,
  MAX_ACTIONS,
  type ContentImpact,
  type ContentRecommendationResult,
  type PlatformBenchmark,
  type PlatformPublication,
  type RecommendationPriority,
  type RecommendedAction,
} from '@/app/(dashboard)/icerik-performansi/content-impact.constants';

/** Öneri üretmek için gereken girdi — henüz önerisi hesaplanmamış içerik. */
export type RecommendationInput = Omit<ContentImpact, 'recommendation'>;

// ── Eşikler (tek yerde, açıklanabilir) ───────────────────────────────────────

/** En güçlü / en zayıf platform arasında "ciddi fark" sayılan kat. */
const PLATFORM_GAP_RATIO = 2;
/** Bir platformun tek başına "güçlü" sayılması için gereken skor (§RULE_PLATFORM_WINNER). */
const WINNER_SCORE = 1.5;
/** Kazananın "belirgin yüksek" sayılması için ikinciye göre gereken kat. */
const WINNER_MARGIN = 1.3;
/** Bu skorun altı "kendi ortalamasının altında" sayılır (§RULE_ALL_PLATFORMS_WEAK). */
const WEAK_SCORE = 0.85;
/** İki ayrı platformda bu skorun üstü = fikir platformdan bağımsız çalışıyor. */
const CROSS_SUCCESS_SCORE = 1.15;
/** Etkileşim oranı platform ortalamasının bu katının altındaysa zayıf sayılır. */
const LOW_ENGAGEMENT_RATIO = 0.6;
/** Etkileşim oranı platform ortalamasının bu katının üstündeyse güçlü sayılır. */
const HIGH_ENGAGEMENT_RATIO = 1.4;
/** Erişim skoru bu katın altındaysa "dağıtım yetersiz" sayılır. */
const LOW_EXPOSURE_SCORE = 0.8;
/** Kaydetme, etkileşimin bu payından fazlaysa içerik "başvuru niteliğinde"dir. */
const SAVE_HEAVY_SHARE = 0.25;
/** Paylaşım, etkileşimin bu payından fazlaysa içerik "yayılan" içeriktir. */
const SHARE_HEAVY_SHARE = 0.2;
/** Yorum, etkileşimin bu payından fazlaysa içerik "tartışma açan" içeriktir. */
const COMMENT_HEAVY_SHARE = 0.1;
/** Instagram'da paylaşım+kaydetme bu payı geçerse içerik "referans" niteliğindedir. */
const IG_SHARE_SAVE_SHARE = 0.15;

// ── Dönüşüm kanıt eşikleri ───────────────────────────────────────────────────
// Ham "pozitif takipçi" tek başına yüksek öncelikli bir aksiyon üretmemeli:
// 4 abone hem istatistiksel gürültü olabilir hem de içeriğin değil kanalın
// büyümesinden gelebilir. Üç koşul birden aranır: mutlak hacim, izlenme tabanı
// ve bin izlenme başına oran.
/** Bu kazanımın altında sonuç "sinyal" sayılır, "kanıt" değil. */
const MIN_FOLLOWER_VOLUME = 25;
/** Oranın anlamlı olması için gereken en az izlenme tabanı. */
const MIN_VIEWS_FOR_CONVERSION = 5_000;
/** Bin izlenme başına bu kazanımın üstü güçlü dönüşüm sayılır. */
const STRONG_CONVERSION_PER_1000 = 0.5;
/** "Fikri durdur" kararı için gereken en az skorlu platform sayısı. */
const MIN_PLATFORMS_FOR_IDEA_VERDICT = 2;

/** Video ağırlıklı platformlar — X ile kıyaslanan taraf (§RULE_X_STRONG). */
const VIDEO_PLATFORMS: ContentPlatform[] = ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'];

/**
 * İçerik formatına göre MANTIKLI dağıtım platformları.
 * Tek platformlu içerikte "her platformda paylaş" demek körlemesine öneridir;
 * bir tweet'i Twitch'e önermek sistemin güvenilirliğini düşürür.
 */
const PLATFORMS_BY_CONTENT_TYPE: Record<string, ContentPlatform[]> = {
  'Video': ['YOUTUBE'],
  'Short / Reels': ['INSTAGRAM', 'TIKTOK', 'YOUTUBE'],
  'Gönderi / Post': ['INSTAGRAM', 'X'],
  'Tweet / Thread': ['X'],
  'Canlı Yayın': ['TWITCH', 'YOUTUBE'],
  'Hikaye / Story': ['INSTAGRAM'],
};

function fmt(n: number): string {
  return n.toLocaleString('tr-TR');
}

function names(platforms: ContentPlatform[]): string {
  return platforms.map((p) => PLATFORM_LABELS[p]).join(', ');
}

function pct(n: number): string {
  return `%${Math.round(n * 100)}`;
}

/** Skoru olan yayınlar — kıyas yalnızca bunlar üzerinden yapılır. */
function scoredPubs(pubs: PlatformPublication[]): (PlatformPublication & { score: number })[] {
  return pubs.filter((p) => p.score != null) as (PlatformPublication & { score: number })[];
}

/**
 * Bu içerik tipi için hangi platformlar hâlâ boşta.
 * Bilinmeyen tipte hiçbir platform uydurulmaz — boş liste döner ve öneri
 * platform ismi vermeden genel kalır.
 */
function suggestedPlatforms(contentType: string, publishedOn: Set<ContentPlatform>): ContentPlatform[] {
  const candidates = PLATFORMS_BY_CONTENT_TYPE[contentType] ?? [];
  return candidates.filter((p) => !publishedOn.has(p));
}

export const contentPerformanceRecommendationService = {
  /**
   * Bir içeriğin platform sonuçlarından editoryal sonuç üret.
   * `benchmarks` platform içi ortalamalardır (fallback ve etkileşim oranı kıyası).
   */
  evaluate(
    input: RecommendationInput,
    benchmarks: Partial<Record<ContentPlatform, PlatformBenchmark>> = {}
  ): ContentRecommendationResult {
    const { publications: pubs, totals, comparison, verdict, plannedPlatforms, contentType } = input;

    const observation: string[] = [];
    const interpretation: string[] = [];
    const collected: RecommendedAction[] = [];
    const triggeredRules: string[] = [];

    const fire = (rule: string) => { triggeredRules.push(rule); };
    const act = (a: RecommendedAction) => { collected.push(a); };

    // ── Gözlem: çıplak sayılar (§11 "NE OLDU?") ───────────────────────────────
    const platformNames = names(pubs.map((p) => p.platform));
    observation.push(
      pubs.length === 1
        ? `Tek platformda yayınlandı: ${platformNames}.`
        : `${pubs.length} platformda yayınlandı: ${platformNames}.`
    );

    // Görünürlük ve izlenme AYRI ölçülerdir; biri diğerinin alt kümesi değildir.
    // Tekrar izlemeler yüzünden izlenme görünürlükten büyük olabilir, o yüzden
    // "bunun X kadarı" gibi bir kapsama ilişkisi kurulmuyor.
    if (totals.exposure.value != null) {
      observation.push(
        `Toplam platform görünürlüğü ${fmt(totals.exposure.value)} — veri kapsamı ${totals.exposure.available}/${totals.exposure.total} platform.`
      );
    } else {
      observation.push('Hiçbir platformdan görünürlük verisi gelmedi.');
    }

    if (totals.views.value != null) {
      observation.push(
        `Platformlardaki toplam içerik izlenmesi ${fmt(totals.views.value)}; tekrar izlemeler nedeniyle daha yüksek olabilir.`
      );
    }

    if (totals.engagements.value != null) {
      observation.push(
        `Ham etkileşim toplamı ${fmt(totals.engagements.value)} (beğeni + yorum + paylaşım + kaydetme) — veri kapsamı ${totals.engagements.available}/${totals.engagements.total} platform.`
      );
    }

    // Platform platform oran — "Instagram kendi ortalamasının 1,62 katına ulaştı."
    for (const p of scoredPubs(pubs)) {
      observation.push(`${PLATFORM_LABELS[p.platform]} kendi ortalamasının ${fmtRatio(p.score)} katına ulaştı.`);
    }

    // ── R01: hiç yayın kaydı yok ─────────────────────────────────────────────
    if (pubs.length === 0) {
      fire('R01_NO_PUBLICATION');
      interpretation.push('Bu içeriğin hiçbir platformda yayın kaydı yok, dolayısıyla performansı ölçülemiyor.');
      act({
        code: 'RECORD_PUBLICATION',
        label: 'Yayın kaydı gir',
        reason: 'Kart yayınlandı işaretli ama platform kaydı yok.',
        priority: 'HIGH',
        group: 'DATA',
      });
      return finalize({ observation, interpretation, collected, triggeredRules });
    }

    // ── R02: planlanmış ama yayınlanmamış platform ───────────────────────────
    const publishedOn = new Set(pubs.map((p) => p.platform));
    const missing = plannedPlatforms.filter((p) => !publishedOn.has(p));
    if (missing.length > 0) {
      fire('R02_MISSING_PLANNED_PLATFORM');
      interpretation.push(
        `${names(missing)} için plan vardı ama yayın kaydı yok — içeriğin erişimi planlananın altında kaldı.`
      );
      act({
        code: 'PUBLISH_MISSING_PLATFORM',
        label: `${names(missing)} paylaşımını tamamla`,
        reason: 'Kartta planlanmış ama yayın kaydı girilmemiş platform var.',
        priority: 'MEDIUM',
        group: 'DISTRIBUTE_WIDER',
      });
    }

    // ── R03: tek platform (§RULE_SINGLE_PLATFORM_ONLY) ───────────────────────
    if (pubs.length === 1) {
      fire('R03_SINGLE_PLATFORM');
      const strongResult = verdict.status === 'GUCLU' || verdict.status === 'COK_GUCLU';
      // Körlemesine "her platforma çık" demiyoruz — formata uyan platformlar.
      const targets = suggestedPlatforms(contentType, publishedOn);
      interpretation.push(
        strongResult
          ? `${platformNames} üzerinde iyi sonuç verdi ama tek platformda kaldı — aynı üretimden ikinci bir platform bedava erişim demek.`
          : 'Sonuç tek platformun verisine dayanıyor; genel bir platform başarısı çıkarımı yapılamaz.'
      );
      act({
        code: 'CROSS_POST',
        label: targets.length > 0
          ? `${names(targets)} üzerinde de dağıt`
          : 'Aynı içeriği uygun bir platformda daha dağıt',
        reason: targets.length > 0
          ? `"${contentType}" formatı bu platformlara uyuyor ve içerik oralarda hiç yayınlanmamış.`
          : strongResult
            ? 'Tek platformda güçlü sonuç aldı; çapraz paylaşım ek üretim maliyeti gerektirmiyor.'
            : 'Karşılaştırma yapılabilmesi için en az iki platform sonucu gerekiyor.',
        priority: strongResult ? 'HIGH' : 'MEDIUM',
        group: 'DISTRIBUTE_WIDER',
      });
    }

    // ── R04: elle girilmesi gereken sayılar boş ──────────────────────────────
    const emptyManual = pubs.filter(
      (p) => p.source === 'MANUAL' && Object.values(p.metrics).every((v) => v == null)
    );
    if (emptyManual.length > 0) {
      fire('R04_MISSING_MANUAL_METRICS');
      interpretation.push(
        `${names(emptyManual.map((p) => p.platform))} sayıları girilmemiş; toplamlar bu platformları içermiyor.`
      );
      act({
        code: 'ENTER_MANUAL_METRICS',
        label: `${names(emptyManual.map((p) => p.platform))} sayılarını gir`,
        reason: 'API entegrasyonu olmayan platformların metrikleri elle giriliyor; boş kalınca toplam etki eksik görünür.',
        priority: 'MEDIUM',
        group: 'DATA',
      });
    }

    // ── R16: API platformu bağlı ama verisi hiç gelmemiş ─────────────────────
    // Yeni paylaşılan bir içerik henüz senkronizasyona girmemiş olabilir; bu
    // "veri yok" durumunun sebebi elle giriş eksikliği DEĞİLDİR.
    const unsynced = pubs.filter(
      (p) => p.source === 'API' && Object.values(p.metrics).every((v) => v == null)
    );
    if (unsynced.length > 0) {
      fire('R16_UNSYNCED_API_PLATFORM');
      interpretation.push(
        `${names(unsynced.map((p) => p.platform))} yayını henüz senkronize edilmemiş; sayıları API'den gelene kadar toplam etki eksik görünür.`
      );
      act({
        code: 'SYNC_PLATFORM',
        label: `${names(unsynced.map((p) => p.platform))} senkronizasyonunu çalıştır`,
        reason: 'Yayın kaydı bağlı ama platformun metrikleri henüz çekilmemiş.',
        priority: 'MEDIUM',
        group: 'DATA',
      });
    }

    // ── R05: karşılaştırılabilir skor yok ────────────────────────────────────
    if (verdict.status === 'VERI_YETERSIZ') {
      fire('R05_NO_COMPARABLE_SCORE');
      interpretation.push(
        'Hiçbir platformda güvenilir kıyas ölçütü yok, bu yüzden içerik başarılı ya da başarısız sayılamaz.'
      );
      act({
        code: 'WAIT_FOR_DATA',
        label: 'Kıyas için veri biriktir',
        reason: 'Bu türde/platformda yeterli örnek toplanmadan skor yanıltıcı olur.',
        priority: 'LOW',
        group: 'DATA',
      });
    }

    // ── R06: platformlar arası ciddi fark ────────────────────────────────────
    const { strongest, weakest } = comparison;
    if (strongest && weakest && weakest.score > 0 && strongest.score / weakest.score >= PLATFORM_GAP_RATIO) {
      fire('R06_PLATFORM_GAP');
      interpretation.push(
        `Aynı içerik ${PLATFORM_LABELS[strongest.platform]}'da ${PLATFORM_LABELS[weakest.platform]}'a göre ${fmtRatio(strongest.score / weakest.score)} kat daha iyi karşılandı — sorun içerikte değil, o platforma uyarlanmasında.`
      );
      act({
        code: 'ADAPT_FOR_WEAK_PLATFORM',
        label: `${PLATFORM_LABELS[weakest.platform]} için formatı uyarla`,
        reason: `${PLATFORM_LABELS[strongest.platform]} ile arasındaki fark ${fmtRatio(strongest.score / weakest.score)} kat.`,
        priority: 'HIGH',
        group: 'FIX_WEAK_PLATFORM',
      });
    }

    // ── R17: belirgin platform kazananı (§RULE_PLATFORM_WINNER) ──────────────
    // "1.50x üzerinde VE diğerlerinden belirgin yüksek" — ikisi birden.
    const ranked = scoredPubs(pubs).sort((a, b) => b.score - a.score);
    if (ranked.length >= 2 && ranked[0].score >= WINNER_SCORE && ranked[0].score >= ranked[1].score * WINNER_MARGIN) {
      const winner = ranked[0];
      fire('R17_PLATFORM_WINNER');
      interpretation.push(
        `${PLATFORM_LABELS[winner.platform]} ${fmtRatio(winner.score)}x ile hem eşiğin hem diğer platformların belirgin üstünde — bu paketleme biçiminin o platformda çalıştığına işaret ediyor.`
      );
      act({
        code: 'REUSE_WINNER_PACKAGING',
        label: `${PLATFORM_LABELS[winner.platform]} paketleme biçimini tekrar kullan`,
        reason: `${PLATFORM_LABELS[winner.platform]} ${fmtRatio(winner.score)}x, ikinci sıradaki ${PLATFORM_LABELS[ranked[1].platform]} ${fmtRatio(ranked[1].score)}x.`,
        priority: 'HIGH',
        group: 'REUSE_WINNER',
      });
      act({
        code: 'CONTINUE_ON_WINNER',
        label: `Aynı fikri ${PLATFORM_LABELS[winner.platform]} için sürdür`,
        reason: 'Fikir bu platformda ortalamanın belirgin üstünde karşılık buldu.',
        priority: 'HIGH',
        group: 'FOLLOW_UP',
      });
      const losers = ranked.slice(1).filter((p) => p.score < WEAK_SCORE).map((p) => p.platform);
      if (losers.length > 0) {
        act({
          code: 'REPACKAGE_WEAK_PLATFORMS',
          label: `${names(losers)} için yeniden paketle`,
          reason: `Aynı fikir bu platformlarda ${WEAK_SCORE}x eşiğinin altında kaldı.`,
          priority: 'MEDIUM',
          group: 'FIX_WEAK_PLATFORM',
        });
      }
    }

    // ── R19: çapraz platform başarısı (§RULE_CROSS_PLATFORM_SUCCESS) ─────────
    const crossWinners = ranked.filter((p) => p.score > CROSS_SUCCESS_SCORE);
    if (crossWinners.length >= 2) {
      fire('R19_CROSS_PLATFORM_SUCCESS');
      interpretation.push(
        `${names(crossWinners.map((p) => p.platform))} tarafında ${fmtRatio(CROSS_SUCCESS_SCORE)}x eşiğinin üstünde kaldı — fikir tek bir platformun algoritmasına değil, konunun kendisine dayanıyor gibi görünüyor.`
      );
      act({
        code: 'SEQUEL_SAME_TOPIC',
        label: 'Benzer konuyla devam içeriği üret',
        reason: `${crossWinners.length} ayrı platformda ortalamanın üstünde sonuç.`,
        priority: 'HIGH',
        group: 'FOLLOW_UP',
      });
      act({
        code: 'APPLY_FORMAT_TO_OTHER_SUBJECT',
        label: 'Aynı formatı başka oyuncu/takıma uygula',
        reason: 'Format platformdan bağımsız çalıştığı için konu değişince de tutma ihtimali yüksek.',
        priority: 'MEDIUM',
        group: 'REAPPLY_FORMAT',
      });
    }

    // ── R18: yeterli veriye sahip platformların çoğu zayıf (§RULE_ALL_PLATFORMS_WEAK)
    // Bir platform açıkça tuttuysa fikir ölü değildir — o zaman sorun konu
    // seçimi değil, diğer platformlara uyarlanmasıdır (R17 / R20 devreye girer).
    // Bu yüzden "çoğunluk zayıf" sayımı tek başına yetmez.
    // "Platformların çoğu" ifadesi EN AZ İKİ platform gerektirir: tek bir
    // platformun ortalamanın biraz altında kalması fikri gömmek için yeterli
    // kanıt değildir. Tek platformlu içerikte R03 zaten çapraz paylaşım öneriyor.
    const weakOnes = ranked.filter((p) => p.score < WEAK_SCORE);
    const anyStrong = ranked.some((p) => p.score > CROSS_SUCCESS_SCORE);
    if (ranked.length >= MIN_PLATFORMS_FOR_IDEA_VERDICT && weakOnes.length * 2 > ranked.length && !anyStrong) {
      fire('R18_ALL_PLATFORMS_WEAK');
      interpretation.push(
        `Skoru ölçülebilen ${ranked.length} platformun ${weakOnes.length} tanesi ${WEAK_SCORE}x eşiğinin altında — konu ya da sunum bu haliyle tutmamış görünüyor.`
      );
      interpretation.push(
        'Konu korunacaksa bile aynı hook ve sunumla yeniden kullanılmamalı; aynı paketleme büyük ihtimalle aynı sonucu verir.'
      );
      act({
        code: 'PAUSE_TOPIC',
        label: 'Bu fikri yakın zamanda tekrarlama',
        reason: `${weakOnes.length}/${ranked.length} platform ${WEAK_SCORE}x altında.`,
        priority: 'HIGH',
        group: 'STOP_IDEA',
      });
      act({
        code: 'STUDY_AS_FAILURE',
        label: 'Başarısız örnek olarak incelemeye gönder',
        reason: 'Tutmayan içeriklerin ortak yanını görebilmek için kayda alınmalı.',
        priority: 'MEDIUM',
        group: 'REVIEW',
      });
    }

    // ── R07 / R08: genel sonuç ───────────────────────────────────────────────
    if (verdict.status === 'COK_GUCLU') {
      fire('R07_STRONG_EVERYWHERE');
      interpretation.push('Birden fazla platformda ortalamanın belirgin üstünde — konu ve format birlikte çalışıyor.');
      act({
        code: 'REPEAT_TOPIC',
        label: 'Bu konuyu/formatı tekrarla',
        reason: 'Birden fazla platformda çok güçlü sonuç aldı.',
        priority: 'HIGH',
        group: 'FOLLOW_UP',
      });
    } else if (verdict.status === 'ZAYIF') {
      fire('R08_WEAK_EVERYWHERE');
      interpretation.push('Platformların çoğunda kendi ortalamasının altında kaldı — konu seçimi veya sunum tutmadı.');
      act({
        code: 'REVISE_GENRE',
        label: 'Konu seçimini ve açılışı gözden geçir',
        reason: 'Platformların çoğunda ortalama altı sonuç.',
        priority: 'HIGH',
        group: 'REVISE_IDEA',
      });
    }

    // ── R20: X güçlü, video platformları zayıf (§RULE_X_STRONG) ──────────────
    const xPub = ranked.find((p) => p.platform === 'X');
    const videoPubs = ranked.filter((p) => VIDEO_PLATFORMS.includes(p.platform));
    if (xPub && xPub.score > CROSS_SUCCESS_SCORE && videoPubs.length > 0 && videoPubs.every((p) => p.score < WEAK_SCORE)) {
      fire('R20_X_STRONG_VIDEO_WEAK');
      interpretation.push(
        `X ${fmtRatio(xPub.score)}x ile öne çıkarken ${names(videoPubs.map((p) => p.platform))} ${WEAK_SCORE}x altında kaldı — konu tartışma/haber gönderisi olarak güçlü, video olarak zayıf olabilir.`
      );
      act({
        code: 'X_FOLLOW_UP',
        label: 'X üzerinde devam gönderisi hazırla',
        reason: `X ${fmtRatio(xPub.score)}x ile tek güçlü platform.`,
        priority: 'HIGH',
        group: 'FOLLOW_UP',
      });
      act({
        code: 'STRENGTHEN_VIDEO_HOOK',
        label: 'Video versiyonu için daha güçlü açılış / daha kısa paketleme dene',
        reason: `${names(videoPubs.map((p) => p.platform))} tarafında sonuç ${WEAK_SCORE}x altında.`,
        priority: 'HIGH',
        group: 'FIX_WEAK_PLATFORM',
      });
    }

    // ── R09 / R10: erişim ↔ etkileşim dengesi ────────────────────────────────
    const lowEngagement: ContentPlatform[] = [];
    const highEngagement: ContentPlatform[] = [];
    for (const p of pubs) {
      const bench = benchmarks[p.platform];
      const rate = engagementRate(p);
      if (!bench?.avgEngagementRate || rate == null) continue;
      const rel = rate / bench.avgEngagementRate;
      if (rel < LOW_ENGAGEMENT_RATIO) lowEngagement.push(p.platform);
      else if (rel > HIGH_ENGAGEMENT_RATIO) highEngagement.push(p.platform);
    }

    if (lowEngagement.length > 0) {
      fire('R09_HIGH_EXPOSURE_LOW_ENGAGEMENT');
      interpretation.push(
        `${names(lowEngagement)} tarafında içerik gösterildi ama etkileşime dönmedi — izleyiciyi tutan bir sebep oluşmamış.`
      );
      interpretation.push(
        'Yüksek erişim tek başına başarı sayılmamalı; bu içeriğin devamı otomatik olarak güçlü kabul edilmemeli.'
      );
      act({
        code: 'IMPROVE_HOOK',
        label: 'Açılışı ve harekete geçirici kısmı güçlendir (daha net soru / CTA)',
        reason: `${names(lowEngagement)} etkileşim oranı platform ortalamasının belirgin altında.`,
        priority: 'MEDIUM',
        group: 'FIX_WEAK_PLATFORM',
      });
    }

    if (highEngagement.length > 0) {
      const weakDistribution = pubs.some(
        (p) => highEngagement.includes(p.platform) && p.score != null && p.score < LOW_EXPOSURE_SCORE
      );
      if (weakDistribution) {
        fire('R10_HIGH_ENGAGEMENT_LOW_EXPOSURE');
        interpretation.push(
          `${names(highEngagement)} tarafında görenler güçlü tepki verdi ama içerik az kişiye ulaştı — niş ama kaliteli ilgi olabilir, düşük görüntülenme tek başına başarısızlık sayılmamalı.`
        );
        act({
          code: 'BOOST_DISTRIBUTION',
          label: 'Yeniden dağıt / dağıtımı güçlendir (başlık, kapak, etiket, saat)',
          reason: 'Etkileşim oranı ortalamanın üstünde ama erişim ortalamanın altında.',
          priority: 'MEDIUM',
          group: 'BOOST_REACH',
        });
      }
    }

    // ── R21: Instagram paylaşım/kaydetme güçlü (§RULE_INSTAGRAM_SHARES_SAVES) ─
    const ig = pubs.find((p) => p.platform === 'INSTAGRAM');
    if (ig) {
      const { likes, comments, shares, saves } = ig.metrics;
      const spread = (shares ?? 0) + (saves ?? 0);
      const igEngagement = (likes ?? 0) + (comments ?? 0) + spread;
      // Yalnızca paylaşım/kaydetme verisi GERÇEKTEN geldiyse değerlendirilir.
      if ((shares != null || saves != null) && igEngagement > 0 && spread / igEngagement >= IG_SHARE_SAVE_SHARE) {
        fire('R21_IG_SHARE_SAVE_STRONG');
        interpretation.push(
          `Instagram etkileşiminin ${pct(spread / igEngagement)} kadarı paylaşım ve kaydetme — içerik anlık tüketimden çok başvuru/aktarma niteliğinde.`
        );
        act({
          code: 'IG_CAROUSEL',
          label: 'Bilgiyi carousel / kaydedilebilir formata dönüştür',
          // Kanıt doğrudan görünsün: hangi sayılardan çıktığı okunabilir olmalı.
          reason: `${fmt(shares ?? 0)} paylaşım + ${fmt(saves ?? 0)} kaydetme = ${fmt(spread)} güçlü niyet aksiyonu; Instagram bileşen etkileşimlerinin yaklaşık ${pct(spread / igEngagement)}'i.`,
          priority: 'MEDIUM',
          group: 'IG_FORMAT',
        });
        act({
          code: 'IG_PART_TWO',
          label: 'Aynı yapının ikinci bölümünü üret',
          reason: 'Kaydedilen içerik serinin devamını da taşır.',
          priority: 'MEDIUM',
          group: 'FOLLOW_UP',
        });
      }
    }

    // ── R11–R14: etkileşim kompozisyonu ──────────────────────────────────────
    const engTotal = totals.engagements.value;
    if (engTotal != null && engTotal > 0) {
      const share = (v: number | null) => (v == null ? null : v / engTotal);

      const saveShare = share(totals.saves.value);
      if (saveShare != null && saveShare >= SAVE_HEAVY_SHARE) {
        fire('R11_SAVE_HEAVY');
        interpretation.push('Etkileşimin belirgin kısmı kaydetme — içerik anlık tüketimden çok başvuru niteliğinde.');
        act({
          code: 'EVERGREEN_REUSE',
          label: 'Kalıcı / referans içerik olarak yeniden kullan',
          reason: `Kaydetmenin toplam etkileşim içindeki payı ${pct(saveShare)}.`,
          priority: 'MEDIUM',
          group: 'IG_FORMAT',
        });
      }

      const shareShare = share(totals.shares.value);
      if (shareShare != null && shareShare >= SHARE_HEAVY_SHARE) {
        fire('R12_SHARE_HEAVY');
        interpretation.push('Paylaşım payı yüksek — konu izleyicinin başkasına göstermek istediği türden.');
        act({
          code: 'SERIES_FROM_TOPIC',
          label: 'Bu konudan seri üret',
          reason: `Paylaşımın toplam etkileşim içindeki payı ${pct(shareShare)}.`,
          priority: 'MEDIUM',
          group: 'FOLLOW_UP',
        });
      }

      const commentShare = share(totals.comments.value);
      if (commentShare != null && commentShare >= COMMENT_HEAVY_SHARE) {
        fire('R14_COMMENT_HEAVY');
        interpretation.push('Yorum payı yüksek — içerik tartışma açtı.');
        act({
          code: 'FOLLOW_UP_DISCUSSION',
          label: 'Yorumlardan devam içeriği çıkar',
          reason: `Yorumun toplam etkileşim içindeki payı ${pct(commentShare)}.`,
          priority: 'LOW',
          group: 'FOLLOW_UP',
        });
      }
    }

    // ── R13: takipçi/abone kazanımı ──────────────────────────────────────────
    // Ham sayı tek başına kanıt değildir: 4 abone, 50.000 izlenmede zayıf bir
    // sinyaldir. Karar ORAN ve HACİM üzerinden verilir.
    const gained = totals.followersGained.value;
    if (gained != null && gained > 0) {
      fire('R13_FOLLOWER_GROWTH');
      const viewBase = totals.views.value ?? totals.exposure.value;
      const per1000 = viewBase && viewBase > 0 ? (gained / viewBase) * 1000 : null;
      const rateText = per1000 != null ? `bin izlenme başına ${per1000.toFixed(2)}` : 'oran hesaplanamadı';

      const strongEvidence =
        per1000 != null &&
        gained >= MIN_FOLLOWER_VOLUME &&
        (viewBase ?? 0) >= MIN_VIEWS_FOR_CONVERSION &&
        per1000 >= STRONG_CONVERSION_PER_1000;

      if (strongEvidence) {
        interpretation.push(
          `İçerik ${fmt(gained)} yeni takipçi/abone getirdi (${rateText}) — dönüşüm hem hacim hem oran olarak anlamlı.`
        );
        act({
          code: 'FUNNEL_WORKS',
          label: 'Aynı kalıbı takipçi kazandıran içerikler için kullan',
          reason: `${fmt(gained)} kazanım, ${rateText}; ${totals.followersGained.available}/${totals.followersGained.total} platformdan ölçüldü.`,
          priority: 'HIGH',
          group: 'REAPPLY_FORMAT',
        });
      } else {
        // Kanıt yetersiz — sinyali saklamıyoruz ama yüksek öncelikli bir
        // aksiyona da dönüştürmüyoruz.
        interpretation.push(
          `Pozitif dönüşüm sinyali var (${fmt(gained)} takipçi/abone, ${rateText}); veri hacmi düşük, izlemeye devam et.`
        );
        act({
          code: 'WATCH_CONVERSION',
          label: 'Dönüşümü izlemeye devam et',
          reason: `${fmt(gained)} kazanım ölçüldü ama güçlü bir sonuç için gereken hacmin (${MIN_FOLLOWER_VOLUME} kazanım / ${fmt(MIN_VIEWS_FOR_CONVERSION)} izlenme) altında.`,
          priority: 'LOW',
          group: 'REAPPLY_FORMAT',
        });
      }
    }

    // ── R15: eksik veri kapsamı ──────────────────────────────────────────────
    if (totals.exposure.available < totals.exposure.total) {
      fire('R15_PARTIAL_DATA_COVERAGE');
      const gap = totals.exposure.total - totals.exposure.available;
      interpretation.push(
        `${gap} platformun erişim verisi yok; toplamlar gerçek etkinin altında kalıyor.`
      );
      act({
        code: 'COMPLETE_DATA',
        label: 'Eksik platform verisini tamamla',
        reason: `Erişim verisi ${totals.exposure.available}/${totals.exposure.total} platformdan geliyor.`,
        priority: 'LOW',
        group: 'DATA',
      });
    }

    // Yorumlanacak bir şey çıkmadıysa sessiz kalmak yerine durumu açıkça söyle.
    if (interpretation.length === 0) {
      interpretation.push('Sonuçlar platform ortalamalarına yakın; ayrıca dikkat gerektiren bir sapma yok.');
    }

    return finalize({ observation, interpretation, collected, triggeredRules });
  },
};

const PRIORITY_ORDER: Record<RecommendationPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/**
 * Aksiyonun hangi KARAR SLOTUNA düştüğü.
 *
 * Üç aksiyon hakkı varken üçünün de "devam içeriği üret" olması işe yaramaz.
 * Liste bir ana karar, bir platform uyarlaması ve bir kontrollü devam adımı
 * taşıdığında okunabilir oluyor.
 */
type ActionSlot = 'MAIN' | 'ADAPT' | 'NEXT';

const SLOT_OF: Record<RecommendedAction['group'], ActionSlot> = {
  // Ne yapılacağına dair ana karar
  REUSE_WINNER: 'MAIN',
  FOLLOW_UP: 'MAIN',
  REVISE_IDEA: 'MAIN',
  STOP_IDEA: 'MAIN',
  // İçeriği bir platforma/formata uyarlama
  FIX_WEAK_PLATFORM: 'ADAPT',
  DISTRIBUTE_WIDER: 'ADAPT',
  BOOST_REACH: 'ADAPT',
  IG_FORMAT: 'ADAPT',
  // Kontrollü devam / doğrulama
  REAPPLY_FORMAT: 'NEXT',
  REVIEW: 'NEXT',
  DATA: 'NEXT',
};

const SLOT_ORDER: ActionSlot[] = ['MAIN', 'ADAPT', 'NEXT'];

/**
 * Aksiyon listesini sözleşmeye uygun hale getir:
 *   1. önceliğe göre sırala (eşitlikte tetiklenme sırası korunur)
 *   2. aynı ANLAM grubundan yalnızca en öncelikliyi bırak
 *   3. "fikri durdur" ile "fikri sürdür" aynı listede olamaz
 *   4. her karar slotundan en fazla bir aksiyon — çeşitlilik
 *   5. en fazla MAX_ACTIONS aksiyon
 */
function finalize({
  observation,
  interpretation,
  collected,
  triggeredRules,
}: {
  observation: string[];
  interpretation: string[];
  collected: RecommendedAction[];
  triggeredRules: string[];
}): ContentRecommendationResult {
  const sorted = collected
    .map((a, i) => ({ a, i }))
    .sort((x, y) => PRIORITY_ORDER[x.a.priority] - PRIORITY_ORDER[y.a.priority] || x.i - y.i)
    .map(({ a }) => a);

  // Fikir "yakın zamanda tekrarlanmasın" derken aynı listede "devam içeriği
  // üret" demek kendi kendini çürütür — durdurma kararı önceliklidir.
  const stopping = sorted.some((a) => a.group === 'STOP_IDEA');

  const seenGroups = new Set<ActionGroupKey>();
  const eligible: RecommendedAction[] = [];
  for (const a of sorted) {
    if (stopping && (a.group === 'FOLLOW_UP' || a.group === 'REUSE_WINNER')) continue;
    if (seenGroups.has(a.group)) continue;
    seenGroups.add(a.group);
    eligible.push(a);
  }

  // Önce her slottan en öncelikli bir aksiyon; sonra boş kalan yerler kalan
  // en öncelikli aksiyonlarla doldurulur.
  const actions: RecommendedAction[] = [];
  for (const slot of SLOT_ORDER) {
    const pick = eligible.find((a) => SLOT_OF[a.group] === slot && !actions.includes(a));
    if (pick) actions.push(pick);
    if (actions.length === MAX_ACTIONS) break;
  }
  for (const a of eligible) {
    if (actions.length >= MAX_ACTIONS) break;
    if (!actions.includes(a)) actions.push(a);
  }
  actions.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return { observation, interpretation, actions, triggeredRules };
}

type ActionGroupKey = RecommendedAction['group'];
