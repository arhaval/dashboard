/**
 * Prompt builder for the İçerik Motoru "Arhavalize Et" step.
 *
 * Pure function (no I/O) so the prompt shape is testable and versioned via
 * PROMPT_VERSION. The hard guardrail lives here: the AI's factual world is
 * exactly draft_text + source_facts — it may not introduce new factual claims
 * or pass off subjective opinions as the user's. Anything it feels compelled to
 * add goes into `notes`, never the body.
 */

import {
  CTA_TYPES,
  DNA_SECTIONS,
  HOOK_ALTERNATIVE_COUNT,
  HOOK_FAMILIES,
  PAYOFF_TYPES,
  PLAYBOOK_SECTIONS,
  wordTargetFor,
  type VarietyTags,
} from '@/app/(dashboard)/motor/engine.constants';

export interface PromptContext {
  dnaSections: Record<string, string> | null;
  formatLabel: string | null;
  playbook: Record<string, string> | null;
  golds: { title: string; text: string }[];
  references: { title: string; text: string }[];
  /**
   * Son onaylanan finallerin çeşitlilik etiketleri, yeniden eskiye. DNA "son 3
   * içerikte kullanılan aile tekrarlanmaz" diyor; bu liste o kuralın verisidir.
   */
  recentTags: { title: string; tags: VarietyTags }[];
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

  // Etiketi kayıtlı final yoksa bölüm hiç yazılmaz: boş bir "son 3" listesi
  // modele yanlışlıkla "kısıt yok" demekten daha kötüsünü, sahte kısıt duygusunu
  // verir. Kısıt ancak gerçek veri varken uygulanır.
  const tagged = ctx.recentTags.filter(
    (r) => r.tags.hookFamily || r.tags.payoffType || r.tags.ctaType
  );
  const variety = tagged.length
    ? [
        '## ÇEŞİTLİLİK (son onaylanan metinler — tekrarlama kısıtı)',
        ...tagged.map((r, i) => {
          const t = r.tags;
          return (
            `${i + 1}. ${r.title} — hook: ${t.hookFamily ?? '—'} · ` +
            `payoff: ${t.payoffType ?? '—'} · CTA: ${t.ctaType ?? '—'}`
          );
        }),
        'Yukarıda listelenen hook ailesini, payoff tipini ve CTA tipini bu metinde TEKRARLAMA; listede geçmeyen bir seçim yap.',
        'Konu gerçekten başka bir seçime izin vermiyorsa tekrar edebilirsin ama gerekçesini "notes" alanına yaz.',
        '',
      ]
    : [];

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
    ...variety,
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
    'Yalnızca şu JSON yapısında yanıt ver: {"script": "<Arhavalize edilmiş tam metin>", "notes": ["<AI olarak eklemeyi önerdiğin ama metne koymadığın her şey>"], "hook_family": "<...>", "payoff_type": "<...>", "cta_type": "<...>", "hook_alternatives": [{"family": "<kanca ailesi>", "text": "<hook cümlesi>"}]}',
    'notes boş olabilir ([]). script alanı düz metin olmalı (Markdown başlığı zorunlu değil).',
    `hook_family şunlardan biri olmalı: ${HOOK_FAMILIES.join(' | ')}`,
    `payoff_type şunlardan biri olmalı: ${PAYOFF_TYPES.join(' | ')}`,
    `cta_type şunlardan biri olmalı: ${CTA_TYPES.join(' | ')}`,
    'Bu üç alan yazdığın metnin GERÇEKTE ne kullandığını bildirir. Metni etikete uydurma; etiketi metne göre seç.',
    `hook_alternatives tam ${HOOK_ALTERNATIVE_COUNT} seçenek içerir ve her seçenek FARKLI bir kanca ailesinden olur.`,
    'Her seçenek aynı metne açılan gerçek bir alternatiftir: aynı konuyu, aynı vaadi, aynı tonu taşır — yalnızca kanca ailesi değişir.',
    'İlk seçenek, script alanının başındaki hook ile BİREBİR aynı metin olmalıdır (kelimesi kelimesine, noktalama dahil). Kullanıcı diğerini seçtiğinde metnin başı bu eşleşmeyle değiştirilir; eşleşme tutmazsa seçim uygulanamaz.',
    'hook_family alanı ilk seçeneğin ailesidir.',
    'Çeşitlilik listesindeki aileleri mümkün olduğunca seçeneklerin dışında bırak; dört aileden üçünü seçmek zorunda olduğun için hepsinden kaçınman gerekmez.',
  ].join('\n');

  const parts: string[] = [];
  parts.push(`# İçerik başlığı: ${ctx.input.title}`);
  if (ctx.input.topic) parts.push(`# Konu: ${ctx.input.topic}`);
  if (ctx.input.platform) parts.push(`# Platform: ${ctx.input.platform}`);
  if (ctx.input.targetDuration) parts.push(`# Hedef süre/uzunluk: ${ctx.input.targetDuration}`);
  const wordTarget = wordTargetFor(ctx.input.targetDuration);
  if (wordTarget) {
    parts.push(
      `# Kelime hedefi: ${wordTarget.min}-${wordTarget.max} kelime` +
        ' (hedef süreden türetildi, ~170 kelime/dk seslendirme hızı)'
    );
  }
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

/**
 * Onaylanan final metni etiketleyen sınıflandırma çağrısının prompt'u.
 *
 * Doğru kaynak FINAL METİNDİR: üretimden gelen etiket, kullanıcı metni
 * düzenlediyse yanlış olabilir. Tanımlar DNA'nın kendi bölümlerinden gelir ki
 * sınıflandırıcı, metni yazan kurallarla aynı sözlüğü kullansın.
 */
export function buildClassifyPrompt(
  dnaSections: Record<string, string> | null,
  finalText: string
): { system: string; user: string } {
  const definition = (key: string, title: string): string[] => {
    const body = dnaSections?.[key]?.trim();
    return body ? ['', `## ${title}`, body] : [];
  };

  const system = [
    'Sen Arhaval metinlerini etiketleyen bir sınıflandırıcısın.',
    'Görevin: verilen ONAYLANMIŞ metni okuyup üç etiketi seçmek. Metni yeniden yazma, özetleme, yorumlama.',
    ...definition('hook_logic', 'HOOK MANTIĞI (kanca ailelerinin tanımı)'),
    ...definition('payoff', 'PAYOFF MANTIĞI (payoff tiplerinin tanımı)'),
    ...definition('cta', 'CTA YAKLAŞIMI (CTA tiplerinin tanımı)'),
    '',
    '## SEÇENEKLER',
    `hook_family: ${HOOK_FAMILIES.join(' | ')}`,
    `payoff_type: ${PAYOFF_TYPES.join(' | ')}`,
    `cta_type: ${CTA_TYPES.join(' | ')}`,
    '',
    '## KURALLAR',
    '1. Etiketi metnin GERÇEKTE ne yaptığına göre seç; metnin ne yapması gerektiğine göre değil.',
    '2. hook_family metnin ilk cümlesine/açılışına bakar. payoff_type kapanış cümlesine bakar.',
    '3. Metinde izleyiciye yönelik bir çağrı yoksa cta_type "yok" olur.',
    '4. Bir alandan emin değilsen o alanı null bırak. Tahmin etme — yanlış etiket, etiketsizlikten daha zararlıdır.',
    '5. Yukarıdaki listelerin dışında bir değer üretme.',
    '',
    '## ÇIKTI BİÇİMİ',
    'Yalnızca şu JSON yapısında yanıt ver: {"hook_family": "<...>|null", "payoff_type": "<...>|null", "cta_type": "<...>|null"}',
    'Açıklama, gerekçe veya ek alan yazma.',
  ].join('\n');

  return { system, user: `## ETİKETLENECEK METİN\n${finalText.trim()}` };
}
