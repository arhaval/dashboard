/**
 * FINAL metinleri geriye dönük etiketler.
 *
 *   pnpm exec tsx scripts/backfill-script-tags.ts            # kuru çalıştırma
 *   pnpm exec tsx scripts/backfill-script-tags.ts --apply    # yaz
 *   pnpm exec tsx scripts/backfill-script-tags.ts --apply --all   # etiketlileri de yenile
 *
 * Onay akışıyla AYNI yolu kullanır (classifyAndSaveScriptTags), böylece geçmiş
 * ve gelecek metinler aynı ölçüyle etiketlenir. OPENAI_API_KEY gerekir.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import {
  classifyAndSaveScriptTags,
  isUntagged,
  listFinalScripts,
  type FinalScriptRow,
} from '../src/services/ai-classify.service';

const APPLY = process.argv.includes('--apply');
const ALL = process.argv.includes('--all');

function tagLine(r: { hook_family: string | null; payoff_type: string | null; cta_type: string | null }) {
  return `hook=${r.hook_family ?? '—'} payoff=${r.payoff_type ?? '—'} cta=${r.cta_type ?? '—'}`;
}

async function main() {
  const withText: FinalScriptRow[] = await listFinalScripts();
  const missing = withText.filter(isUntagged);
  const targets = ALL ? withText : missing;

  console.log(`final_text dolu FINAL metin: ${withText.length}`);
  console.log(`  eksik etiketli : ${missing.length}`);
  console.log(`  işlenecek      : ${targets.length}${ALL ? ' (--all: etiketliler dahil)' : ''}\n`);

  if (targets.length === 0) {
    console.log('Etiketlenecek metin yok.');
    return;
  }
  if (!APPLY) {
    targets.forEach((r) => console.log(`· ${r.title}  [${tagLine(r)}]  ${r.final_text!.length} kar`));
    console.log('\nKURU ÇALIŞTIRMA — hiçbir şey yazılmadı (--apply ile uygula).');
    return;
  }

  let ok = 0;
  const failed: string[] = [];
  for (const r of targets) {
    const res = await classifyAndSaveScriptTags(r.id);
    if (res.error) {
      failed.push(`${r.title}: ${res.error}`);
      console.log(`✗ ${r.title} — ${res.error}`);
      continue;
    }
    ok += 1;
    console.log(
      `✓ ${r.title}\n    ÖNCE : ${tagLine(r)}\n` +
        `    SONRA: hook=${res.tags.hookFamily ?? '—'} payoff=${res.tags.payoffType ?? '—'} cta=${res.tags.ctaType ?? '—'}`
    );
  }

  console.log(`\n${ok}/${targets.length} metin etiketlendi.`);
  if (failed.length) {
    console.error(`${failed.length} metin etiketlenemedi:`);
    failed.forEach((f) => console.error(`  ✗ ${f}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
