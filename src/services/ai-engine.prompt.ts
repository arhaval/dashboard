/**
 * Prompt builder for the İçerik Motoru "Arhavalize Et" step.
 *
 * Pure function (no I/O) so the prompt shape is testable and versioned via
 * PROMPT_VERSION. The hard guardrail lives here: the AI's factual world is
 * exactly draft_text + source_facts — it may not introduce new factual claims
 * or pass off subjective opinions as the user's. Anything it feels compelled to
 * add goes into `notes`, never the body.
 */

import { DNA_SECTIONS, PLAYBOOK_SECTIONS } from '@/app/(dashboard)/motor/engine.constants';

export interface PromptContext {
  dnaSections: Record<string, string> | null;
  formatLabel: string | null;
  playbook: Record<string, string> | null;
  golds: { title: string; text: string }[];
  references: { title: string; text: string }[];
  input: {
    title: string;
    topic: string | null;
    platform: string | null;
    targetDuration: string | null;
    draftText: string | null;
    sourceFacts: string | null;
  };
}

/**
 * İskelet DNA'da tutulur ama prompt'ta KENDİ bölümünde gösterilir — hem madde
 * listesinde hem ayrı blokta çıkarsa aynı metin iki kez gider.
 */
const SKELETON_KEY = 'skeleton';

/** DNA'da iskelet tanımlanmamışsa kullanılan varsayılan yapı. */
const DEFAULT_SKELETON = [
  'HOOK → TEZ → 3 GÖVDE BLOĞU → PAYOFF → CTA',
  'Format bu sıralamayı veya blok sayısını değiştirmez; yalnızca blokların neyle doldurulacağını belirler.',
  "Varsayılan blok sayısı 3'tür. 2 veya 4 blok yalnızca konunun yapısı gerektiriyorsa kullanılır.",
].join('\n');

function renderSections(
  defs: { key: string; label: string }[],
  values: Record<string, string> | null
): string {
  if (!values) return '(tanımlı değil)';
  const lines = defs
    .map((d) => (values[d.key]?.trim() ? `- ${d.label}: ${values[d.key].trim()}` : null))
    .filter(Boolean);
  return lines.length ? lines.join('\n') : '(tanımlı değil)';
}

export function buildArhavalizePrompt(ctx: PromptContext): { system: string; user: string } {
  // İskelet madde listesinden çıkarılır; aşağıda kendi bölümünde yazılır.
  const dna = renderSections(
    DNA_SECTIONS.filter((d) => d.key !== SKELETON_KEY),
    ctx.dnaSections
  );
  const skeleton = ctx.dnaSections?.[SKELETON_KEY]?.trim() || DEFAULT_SKELETON;
  const playbook = renderSections(PLAYBOOK_SECTIONS, ctx.playbook);

  const system = [
    'Sen Arhaval adlı Türk CS2/espor içerik kanalının editöryel yazarısın.',
    'Görevin: kullanıcının verdiği taslağı ve bilgileri, Arhaval kimliğine ve seçilen formatın kurallarına göre yeniden yazmak (Arhavalize etmek).',
    '',
    '## ARHAVAL DNA (her formatta geçerli, değişmez kimlik)',
    dna,
    '',
    '## METİN İSKELETİ (tüm formatlarda aynı, değişmez)',
    skeleton,
    '',
    `## FORMAT: ${ctx.formatLabel ?? 'Belirtilmedi'} (bu formatın kuralları)`,
    playbook,
    '',
    '## TASLAK ELE ALMA',
    'Kullanıcının taslağı ham malzemedir, taslak metnin kendisi değildir.',
    'Taslaktaki bilgiler, isimler, sayılar ve görüşler korunur — hiçbiri atılmaz, hiçbiri değiştirilmez. Taslakta olmayan olgu eklenmez.',
    'Taslağın sırası korunmaz. Malzeme iskelete yeniden dağıtılır: hangi cümle hook olur, hangisi tez, hangisi hangi bloğa girer.',
    'Taslakta tez cümlesi yoksa, taslağın kanıtladığı şeyden türetilir.',
    'Taslakta anlatıcı sesi yoksa eklenir. Varsa korunur.',
    'Taslakta aynı bilgi birden çok cümleyle tekrarlanmışsa tek cümlede toplanır.',
    'Kullanıcı bir görüş belirtmişse aynen taşınır. Belirtmemişse görüş üretilmez.',
    '',
    '## MUTLAK KURALLAR',
    '1. Bilgi sınırın: SADECE kullanıcının verdiği taslak metin ve ek bilgiler. Bunların dışında YENİ olgusal bilgi (isim, tarih, sayı, olay, iddia) UYDURMA.',
    '2. Kullanıcıya aitmiş gibi öznel görüş/yorum EKLEME. Kullanıcının söylemediği bir kanıyı onun ağzından yazma.',
    '3. Eklenmesi gerektiğini düşündüğün bir bilgi/öneri varsa metne KOYMA; ayrı "notes" listesine yaz.',
    '4. Orijinal bilgileri çarpıtma; sadece dile, ritme, kurguya ve hook/payoff/CTA yapısına Arhaval kimliğini uygula.',
    '5. AI klişelerinden ve genel kalıplardan kaçın; DNA\'daki "Kaçınılacaklar" bölümüne uy.',
    '6. Aşağıdaki örnekler yalnızca STİL/ritim referansıdır; onlardaki OLAYLARI/bilgileri bu metne taşıma.',
    '',
    '## ÇIKTI BİÇİMİ',
    'Yalnızca şu JSON yapısında yanıt ver: {"script": "<Arhavalize edilmiş tam metin>", "notes": ["<AI olarak eklemeyi önerdiğin ama metne koymadığın her şey>"]}',
    'notes boş olabilir ([]). script alanı düz metin olmalı (Markdown başlığı zorunlu değil).',
  ].join('\n');

  const parts: string[] = [];
  parts.push(`# İçerik başlığı: ${ctx.input.title}`);
  if (ctx.input.topic) parts.push(`# Konu: ${ctx.input.topic}`);
  if (ctx.input.platform) parts.push(`# Platform: ${ctx.input.platform}`);
  if (ctx.input.targetDuration) parts.push(`# Hedef süre/uzunluk: ${ctx.input.targetDuration}`);
  parts.push('');
  parts.push('## KULLANICININ TASLAĞI (bilgi kaynağın #1)');
  parts.push(ctx.input.draftText?.trim() || '(taslak girilmedi)');
  if (ctx.input.sourceFacts?.trim()) {
    parts.push('');
    parts.push('## EK NESNEL BİLGİLER (bilgi kaynağın #2)');
    parts.push(ctx.input.sourceFacts.trim());
  }

  if (ctx.golds.length) {
    parts.push('');
    parts.push('## ONAYLI ARHAVAL ÖRNEKLERİ (gold standard — yalnız stil referansı)');
    ctx.golds.forEach((g, i) => parts.push(`### Örnek ${i + 1}: ${g.title}\n${g.text}`));
  }
  if (ctx.references.length) {
    parts.push('');
    parts.push('## REFERANS KÜTÜPHANESİ (bize ait değil — yalnız stil/ritim analizi için)');
    ctx.references.forEach((r, i) => parts.push(`### Referans ${i + 1}: ${r.title}\n${r.text}`));
  }

  parts.push('');
  parts.push('Yukarıdaki taslağı, tüm kurallara uyarak Arhavalize et ve belirtilen JSON biçiminde döndür.');

  return { system, user: parts.join('\n') };
}
