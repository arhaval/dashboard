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

0. **Maç seçimi:** Sayfanın üstünde arhaval.com'dan gelen yaklaşan Türk takımı maçları listelenir (önümüzdeki 72 saat; uç: `tahmin` reposu, `src/app/api/gorsel/yaklasan-maclar`). Her maç paylaşılmaz, paylaşılacak maçı ekip seçer. "Postu hazırla" formu doldurur: takım, rakip ve logosu, Türkiye saati, turnuva satırı, yayın satırı. Kişi önizlemede bakar ve indirir. Form elle de doldurulabilir.
   - **Engel (post hazırlanmaz):** takımın kadro fotoğrafları sistemde yok.
   - **Kontrol notu (post hazırlanır, kişi bakar):** HLTV kadrosu ile bizdeki fotoğraflar uyuşmuyor (yedek ya da ayrılan oyuncu), saat kesin değil, aşama Türkçeye çevrilemedi, rakip logosu yok ya da renkliydi, maçın yayıncılarında Arhaval yok.
   - Turnuva adı İngilizce büyük harfle (noktasız I) yazılır. Arhaval'ın kendi yazımı olan turnuvalar `GORSEL_TURNUVA_ADLARI` listesindedir (ör. SINGAPUR MAJOR). Aşama Türkçe büyük harfle yazılır; Swiss, Play-in gibi İngilizce terimler noktasız kalır.
1. **Önizleme:** Form doldurulur. Panel şablonu iframe'de açar (`?onizleme=1`), veriyi `postMessage` ile gönderir. Şablon çizer ve kendi denetim uyarılarını geri yollar.
2. **İndirme:** `/api/gorsel/render` aynı şablonu başsız Chromium'da 2 kat ölçekte (2160 px) çizer, sonra `src/lib/gorsel/birlestir.ts` ile zeminin üstüne birleştirir. 1080'lik çıktılarda Lanczos küçültme ve yalnız katmana hafif keskinleştirme uygulanır. HD çıktı çizimin kendisidir. Sonuç sRGB PNG olarak yazılır. Chromium GPU taklidi olmadan çalışır; bu hâliyle bellek kullanımı 1 GB'lık sunucu sınırının altında kalır.
3. **Denetim:** Şablonun uyarı listesi boş değilse dosya teslim edilmez. Kontrol edilenler: kenar boşluğu, logo/saat/etiket çakışması, isim sığması, görselin kaynağından büyük gösterilmesi (HD'de bile).

Vercel'de `@sparticuz/chromium` kullanılır. Yerelde Linux'ta da aynı paket çalışır. Windows ve macOS'ta önce `pnpm exec playwright install chromium` çalıştırılır ya da `PLAYWRIGHT_CHROMIUM_PATH` ayarlanır.

Oturum açmadan, komut satırından çizim (Claude Code da bunu kullanır, bkz. `.claude/skills/gorsel-studyosu/SKILL.md`):

```bash
pnpm gorsel --liste
pnpm gorsel mac-gunu --takim bbl --rakip sinners --turnuva "RUSH BRNO 2026 · YARI FİNAL" --saat 19.00 --cikti post,hikaye
pnpm gorsel mac-gunu --rakip-ad "TAKIM" --rakip-logo logo.svg --turnuva "..." --saat 21.30 --yayin yok --cikti post-hd
```

## Maç günü kuralları (onaylı, Kasım 2026)

- **Sahne düzeni, kart yok.** Zemin başların altından itibaren gece petrolüne (`#031C24` → `#021014`) koyulaşır. Oyuncuların gövdesi bu karanlığa erir.
- **Kadro:** Oyuncular omuz omuza durur. Ortadaki en önde, kenara doğru her kademe %5 daha karanlık. Oyuncu boyu HLTV kadrajının 1,4 katıdır.
- **Turnuva satırı** kutusuz yazılır, iki yanında ince çizgi vardır. Şablon yazıldığı gibi basar. Maç listesinden gelen satırda büyük harf kuralı kendiliğinden uygulanır (SINGAPUR MAJOR, YARI FİNAL); elle yazılırsa aynı kural elle uygulanır.
- **Maç bloğu:** Turnuva satırı, logolar ve saat tek grup hâlinde üst başlıkla başların tam ortasında durur. Saat Arhaval Sans kalın italik yazılır.
- **Logolar** beyaz tek renktir ve görsel olarak eşittir. Şablon her logoyu beyaza çevirir, boş kenarlarını kırpar ve kapsamasını ölçer. İki logo önce eşit alana getirilir, sonra daha dolu olanı `(seyrek kapsama / dolu kapsama)^0.35` oranında küçültülür. Çok geniş (EF) ya da çok uzun bir logo saate, turnuva satırına ya da kenara değecekse iki logo birlikte aynı oranda küçülür; eşitlik bozulmaz.
- **Yayın satırı kuralı:** "ARHAVAL YOUTUBE VE KICK'TE CANLI" satırı yalnızca maçı Arhaval yayınlıyorsa konur ve isimlerin hemen altında durur. Yayın yoksa satır hiç konmaz, başka hiçbir şey yer değiştirmez.
- Postlarda "Veri:" ya da kaynak satırı olmaz. Açıklanmamış sponsor adı geçmez.

## Yeni takım eklemek

1. Takımın resmi fotoğrafları önce Arhaval fotoğraf havuzuna girer: kimlik doğrulanır, kadraj üretilir.
2. 1,4 kat kadrajlar (`sablon_foto.py 2.8`, 1120×1168) `takimlar/<takim>/oyuncular/` altına konur. Beyaz logo `takimlar/<takim>/logo.png` olarak eklenir. Yalnız HLTV fotoğrafı varsa (800×834, 2x) post ve hikâye çıkar ama HD çıkmaz; takımda `hdFoto: false` yazılır, panel HD düğmesini kapatır.
3. Takım `src/constants/gorsel.ts` içindeki `GORSEL_TAKIMLAR` listesine eklenir. `eslesme` alanına arhaval.com'daki adı yazılır (küçük harf, yalnız harf ve rakam: "Aurora Gaming" → `auroragaming`); maç listesi takımı bununla tanır. Oyuncular soldan sağa yazılır, ortadaki (3.) en önde durur. Yalnız logosu olan rakipler `GORSEL_RAKIPLER` listesine girer. Listede olmayan rakibin logosu arhaval.com'dan indirilir ya da formdan yüklenir.
4. Kadro değişince fotoğraflar ve liste birlikte güncellenir. Maç listesi HLTV kadrosu ile buradakini karşılaştırır, uyuşmazlığı not olarak gösterir.

Hazır takımlar (Kasım 2026): BBL Esports, Eternal Fire (HLTV fotoğrafları, HD yok), Aurora (16.07.2026 çekimi). Sangal, Fire Flux ve FUT'un fotoğrafları yok; maçları listede görünür ama post hazırlanamaz. FUT'ta SunPayus'un HLTV fotoğrafı hâlâ G2 formalı.

Dosya adlarında yalnızca küçük harf, rakam ve `-` kullanılır. Doğrulama şeması (`src/lib/validations/gorsel.ts`) başka yolları kabul etmez.

## Yeni şablon eklemek

1. `sablonlar/<ad>.html` yazılır. Veri `window.GORSEL_VERI` ya da `postMessage` ile gelir. Çizim bitince `window.CHECK = { uyarilar }` ve `document.title = 'ready'` ayarlanır. `mac-gunu.html` örnek alınır.
2. Şablon `GORSEL_SABLONLAR` listesine, veri şeması `src/lib/validations/gorsel.ts` dosyasına eklenir.
3. `pnpm gorsel` ile çizilip onaylı tasarımla karşılaştırılır.
