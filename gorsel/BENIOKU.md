# Görsel Stüdyosu varlıkları

Arhaval sosyal medya şablonları ve bunların kullandığı her şey bu klasörde durur. Panelde **Görsel Stüdyosu** (`/gorsel-studyosu`) bu klasörü kullanır.

Klasör `public/` altında değildir, yani dışarıya açık değildir. Panel önizlemesi dosyaları `/api/gorsel/varlik/...` üzerinden alır, sunucu çizimi ise doğrudan diskten okur. İki yol da yalnızca Görsel Stüdyosu yetkisi (`visual-studio`) olan kullanıcıya açıktır.

```
gorsel/
  sablonlar/mac-gunu.html     ← şablon (önizleme ve sunucu çizimi aynı dosyayı kullanır)
  ortak/fontlar/               ← Archivo (OFL) + Arhaval Sans kalın italik (yalnız büyük rakamlar)
  ortak/zemin/                 ← petrol mesh zemin: post (1080×1440), post-hd (2160×2880), hikaye (1080×1920)
  ortak/logolar/               ← Arhaval A, TitanSeat, YouTube, Kick
  takimlar/<takim>/logo.png    ← beyaz tek renk logo (yüksek çözünürlük)
  takimlar/<takim>/oyuncular/  ← oyuncu fotoğrafları, 1120×1168 şeffaf PNG
```

## Nasıl çalışır

1. **Önizleme:** Form doldurulur. Panel şablonu iframe'de açar (`?onizleme=1`), veriyi `postMessage` ile gönderir. Şablon çizer ve kendi denetim uyarılarını geri yollar.
2. **İndirme:** `/api/gorsel/render` aynı şablonu başsız Chromium'da 4 kat ölçekte çizer, sonra `src/lib/gorsel/birlestir.ts` ile zeminin üstüne birleştirir. Bu adımlar: Lanczos küçültme, yalnız katmana hafif keskinleştirme, sRGB PNG.
3. **Denetim:** Şablonun uyarı listesi boş değilse dosya teslim edilmez. Kontrol edilenler: kenar boşluğu, logo/saat/etiket çakışması, isim sığması, görselin kaynağından büyük gösterilmesi (HD'de bile).

Vercel'de `@sparticuz/chromium` kullanılır. Yerelde Linux'ta da aynı paket çalışır. Windows ve macOS'ta önce `pnpm exec playwright install chromium` çalıştırılır ya da `PLAYWRIGHT_CHROMIUM_PATH` ayarlanır.

Oturum açmadan örnek çizim almak için:

```bash
pnpm exec tsx scripts/gorsel-ornek.ts post /tmp
pnpm exec tsx scripts/gorsel-ornek.ts post-hd /tmp
YAYIN=0 pnpm exec tsx scripts/gorsel-ornek.ts hikaye /tmp
```

## Maç günü kuralları (onaylı, Kasım 2026)

- **Sahne düzeni, kart yok.** Zemin başların altından itibaren gece petrolüne (`#031C24` → `#021014`) koyulaşır. Oyuncuların gövdesi bu karanlığa erir.
- **Kadro:** Oyuncular omuz omuza durur. Ortadaki en önde, kenara doğru her kademe %5 daha karanlık. Oyuncu boyu HLTV kadrajının 1,4 katıdır.
- **Turnuva satırı** kutusuz yazılır, iki yanında ince çizgi vardır. Yazıldığı gibi çıkar, büyük harf kuralı elle uygulanır (SINGAPUR MAJOR, YARI FİNAL).
- **Maç bloğu:** Turnuva satırı, logolar ve saat tek grup hâlinde üst başlıkla başların tam ortasında durur. Saat Arhaval Sans kalın italik yazılır.
- **Logolar** beyaz tek renktir ve görsel olarak eşittir. Şablon her logoyu beyaza çevirir, boş kenarlarını kırpar ve kapsamasını ölçer. İki logo önce eşit alana getirilir, sonra daha dolu olanı `(seyrek kapsama / dolu kapsama)^0.35` oranında küçültülür.
- **Yayın satırı kuralı:** "ARHAVAL YOUTUBE VE KICK'TE CANLI" satırı yalnızca maçı Arhaval yayınlıyorsa konur ve isimlerin hemen altında durur. Yayın yoksa satır hiç konmaz, başka hiçbir şey yer değiştirmez.
- Postlarda "Veri:" ya da kaynak satırı olmaz. Açıklanmamış sponsor adı geçmez.

## Yeni takım eklemek

1. Takımın resmi fotoğrafları önce Arhaval fotoğraf havuzuna girer: kimlik doğrulanır, kadraj üretilir.
2. 1,4 kat kadrajlar (`sablon_foto.py 2.8`, 1120×1168) `takimlar/<takim>/oyuncular/` altına konur. Beyaz logo `takimlar/<takim>/logo.png` olarak eklenir.
3. Takım `src/constants/gorsel.ts` içindeki `GORSEL_TAKIMLAR` listesine eklenir. Yalnız logosu olan rakipler `GORSEL_RAKIPLER` listesine girer. Listede olmayan rakibin logosu formdan yüklenebilir.

Dosya adlarında yalnızca küçük harf, rakam ve `-` kullanılır. Doğrulama şeması (`src/lib/validations/gorsel.ts`) başka yolları kabul etmez.

## Yeni şablon eklemek

1. `sablonlar/<ad>.html` yazılır. Veri `window.GORSEL_VERI` ya da `postMessage` ile gelir. Çizim bitince `window.CHECK = { uyarilar }` ve `document.title = 'ready'` ayarlanır. `mac-gunu.html` örnek alınır.
2. Şablon `GORSEL_SABLONLAR` listesine, veri şeması `src/lib/validations/gorsel.ts` dosyasına eklenir.
3. `scripts/gorsel-ornek.ts` ile çizilip onaylı tasarımla karşılaştırılır.
