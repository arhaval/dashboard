/**
 * Görsel Stüdyosu: arhaval.com maç verisi → maç günü formu dönüşümünün
 * deterministik doğrulaması. Ağa ve veritabanına dokunmaz.
 *
 *   pnpm exec tsx scripts/check-gorsel-mac.ts
 *
 * Asıl sınanan şeyler postta YANLIŞ bilgi çıkmaması: Türkiye saati, turnuva
 * satırının büyük harf kuralı (yabancı ad İngilizce, aşama Türkçe), yayın
 * satırı kuralı ve fotoğrafı olmayan takımın engellenmesi.
 */

import {
  arhavalMacSchema,
  arhavalYayinliyor,
  gunEtiketi,
  macFormu,
  macOzeti,
  turkiyeSaati,
  turnuvaSatiri,
  type ArhavalMac,
} from '../src/lib/gorsel/arhaval-mac';
import { macGunuVerisi } from '../src/lib/gorsel/mac-gunu';
import { logoKaynagiGecerli } from '../src/services/gorsel-mac.service';

let passed = 0;
const failures: string[] = [];
function eq(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed += 1; return; }
  failures.push(`${name} — beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`);
}
function ok(name: string, kosul: boolean, detay?: unknown) {
  if (kosul) { passed += 1; return; }
  failures.push(detay === undefined ? name : `${name} — ${JSON.stringify(detay)}`);
}

const BBL_KADRO = ['leakz', 'salazar', 'NickyB', 'IceBerg', 'MistR'].map((nick) => ({ nick, hltvId: null }));
function mac(d: Partial<ArhavalMac> = {}): ArhavalMac {
  return arhavalMacSchema.parse({
    id: '11111111-1111-4111-8111-111111111111',
    takim: { ad: 'BBL Esports', slug: 'bbl-esports', oyuncular: BBL_KADRO },
    rakip: { ad: 'SINNERS', logoUrl: 'https://ornek.supabase.co/logo.svg' },
    baslangic: '2026-11-22T16:00:00.000Z',
    saatKesin: true,
    turnuva: 'Rush Brno 2026',
    asama: 'Yarı final',
    asamaHam: 'Semi-final',
    yayinlar: [{ platform: 'KICK', channel: 'arhaval', url: 'https://kick.com/arhaval' }],
    ...d,
  });
}

// ── Saat ve gün ─────────────────────────────────────────────────────────────
eq('UTC 16:00 → Türkiye 19.00', turkiyeSaati('2026-11-22T16:00:00.000Z'), '19.00');
eq('gece yarısını geçen saat', turkiyeSaati('2026-11-22T21:30:00.000Z'), '00.30');
eq('aynı gün → Bugün', gunEtiketi('2026-11-22T16:00:00.000Z', new Date('2026-11-22T06:00:00.000Z')), 'Bugün');
eq('Türkiye gece yarısından sonra → Yarın', gunEtiketi('2026-11-22T21:30:00.000Z', new Date('2026-11-22T06:00:00.000Z')), 'Yarın');

// ── Turnuva satırı ──────────────────────────────────────────────────────────
eq('yabancı ad + Türkçe aşama', turnuvaSatiri('Rush Brno 2026', 'Yarı final'), 'RUSH BRNO 2026 · YARI FİNAL');
eq('Singapore noktasız I ile', turnuvaSatiri('IEM Singapore 2026', 'Büyük final'), 'IEM SINGAPORE 2026 · BÜYÜK FİNAL');
eq('Major: Arhaval yazımı SINGAPUR MAJOR, stage korunur', turnuvaSatiri('PGL Major Singapore 2026 Stage 1', 'Swiss · açılış maçı'), 'SINGAPUR MAJOR STAGE 1 · SWISS · AÇILIŞ MAÇI');
eq('Play-in noktasız I', turnuvaSatiri('ESL Pro League Season 24', 'Play-in · 1. tur'), 'ESL PRO LEAGUE SEASON 24 · PLAY-IN · 1. TUR');
eq('Major: stage yoksa yalnız ad', turnuvaSatiri('PGL Major Singapore 2026', 'Playoff · çeyrek final'), 'SINGAPUR MAJOR · PLAYOFF · ÇEYREK FİNAL');
eq('aşama yoksa yalnız turnuva', turnuvaSatiri('ESL Pro League Season 24', null), 'ESL PRO LEAGUE SEASON 24');
eq('grup aşaması Türkçe büyük harf', turnuvaSatiri('IEM Cologne 2026', 'A Grubu · açılış maçı'), 'IEM COLOGNE 2026 · A GRUBU · AÇILIŞ MAÇI');

// ── Yayın satırı kuralı ─────────────────────────────────────────────────────
ok('Arhaval kanalı varsa yayın var', arhavalYayinliyor(mac()));
ok('başka kanal varsa yayın yok', !arhavalYayinliyor(mac({ yayinlar: [{ platform: 'TWITCH', channel: 'bbl_tv', url: 'https://twitch.tv/bbl_tv' }] })));
ok('yayıncı yoksa yayın yok', !arhavalYayinliyor(mac({ yayinlar: [] })));

// ── Hazırlık durumu ─────────────────────────────────────────────────────────
const tam = macOzeti(mac());
eq('BBL tam veri: engel yok', tam.engeller, []);
eq('BBL tam veri: not yok', tam.notlar, []);
eq('özet saat', tam.saat, '19.00');
ok('fotoğrafı olmayan takım hazırlanamaz', macOzeti(mac({ takim: { ad: 'Sangal', slug: 'sangal', oyuncular: [] } })).engeller.length === 1);
const EF_KADRO = ['jottAAA', 'Kvem', 'MisteM', 'regali', 'soulfly'].map((nick) => ({ nick, hltvId: null }));
const AUR_KADRO = ['Jimpphat', 'kyxsan', 'Wicadia', 'woxic', 'XANTARES'].map((nick) => ({ nick, hltvId: null }));
eq('Eternal Fire eşleşir, kadro tam', [macFormu(mac({ takim: { ad: 'Eternal Fire', slug: 'eternal-fire', oyuncular: EF_KADRO } })).takim,
  macOzeti(mac({ takim: { ad: 'Eternal Fire', slug: 'eternal-fire', oyuncular: EF_KADRO } })).engeller], ['ef', []]);
eq('Aurora Gaming adı Aurora ile eşleşir, kadro tam', [macFormu(mac({ takim: { ad: 'Aurora Gaming', slug: 'aurora', oyuncular: AUR_KADRO } })).takim,
  macOzeti(mac({ takim: { ad: 'Aurora Gaming', slug: 'aurora', oyuncular: AUR_KADRO } })).notlar.filter((n) => n.includes('kadro') || n.includes('fotoğraf'))], ['aurora', []]);
ok('yedek oyuncu → not, engel değil', (() => {
  const o = macOzeti(mac({ takim: { ad: 'BBL Esports', slug: 'bbl-esports', oyuncular: [...BBL_KADRO, { nick: 'Boye', hltvId: null }] } }));
  return o.engeller.length === 0 && o.notlar.some((n) => n.includes('Boye'));
})());
ok('kadrodan çıkan oyuncu → not', macOzeti(mac({ takim: { ad: 'BBL Esports', slug: null, oyuncular: BBL_KADRO.slice(0, 4) } })).notlar.some((n) => n.includes('MistR')));
ok('kesin olmayan saat → not', macOzeti(mac({ saatKesin: false })).notlar.length === 1);
ok('çevrilemeyen aşama → not', macOzeti(mac({ asama: null, asamaHam: 'Showdown' })).notlar.some((n) => n.includes('Showdown')));

// ── Logo kaynağı (yalnız https + arhaval.com'un logo kaynakları) ──────────────
ok('Supabase depolaması kabul', logoKaynagiGecerli('https://orwjtzjtzunmbcmouklw.supabase.co/storage/v1/object/public/team-logos/a.png'));
ok('arhaval.com kabul', logoKaynagiGecerli('https://arhaval.com/mirror/a.png'));
ok('http reddedilir', !logoKaynagiGecerli('http://orwjtzjtzunmbcmouklw.supabase.co/a.png'));
ok('başka alan adı reddedilir', !logoKaynagiGecerli('https://ornek.com/a.png'));
ok('sonu taklit eden alan adı reddedilir', !logoKaynagiGecerli('https://x.supabase.co.ornek.com/a.png') && !logoKaynagiGecerli('https://arhaval.com.ornek.com/a.png'));
ok('bozuk adres reddedilir', !logoKaynagiGecerli('logo.png'));

// ── Form ────────────────────────────────────────────────────────────────────
const f = macFormu(mac());
eq('hazır rakip kendi logosuyla', [f.rakip, f.rakipLogoUrl], ['sinners', null]);
eq('form alanları', [f.takim, f.turnuva, f.saat, f.yayin], ['bbl', 'RUSH BRNO 2026 · YARI FİNAL', '19.00', true]);
const yabanci = macFormu(mac({ rakip: { ad: 'Fire Flux', logoUrl: 'https://ornek.supabase.co/ff.png' } }));
eq('listede olmayan rakip: logo indirilecek', [yabanci.rakip, yabanci.rakipAd, yabanci.rakipLogoUrl], ['yukle', 'Fire Flux', 'https://ornek.supabase.co/ff.png']);
const d = macGunuVerisi({ ...f, rakipLogo: null });
ok('hazır rakipli form şemadan geçer', d.ok, d.ok ? undefined : d.hatalar);

console.log(`\n${passed} kontrol geçti.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} kontrol BAŞARISIZ:`);
  for (const x of failures) console.error(`  ✗ ${x}`);
  process.exit(1);
}
console.log('Tümü başarılı ✓');
