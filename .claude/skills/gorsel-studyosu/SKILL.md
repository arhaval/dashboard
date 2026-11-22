---
name: gorsel-studyosu
description: Arhaval sosyal medya postu üretir (şimdilik maç günü postu). Panel /gorsel-studyosu ile aynı şablon ve aynı kalite hattı kullanılır. "maç günü postu", "BBL postu yap", "post hazırla", "görsel üret", "şablonu değiştir" gibi isteklerde kullan.
---

# Görsel Stüdyosu (Claude Code)

Panelde formla yapılan iş burada komutla yapılır. İkisi de AYNI şablonu (`gorsel/sablonlar/`) ve AYNI çizim hattını (`src/services/gorsel-render.service.ts`) kullanır. Bu yüzden burada üretilen dosya panelden inenle birebir aynıdır. Kurallar ve ayrıntılar: `gorsel/BENIOKU.md`.

## İlk kurulum (bir kez)

```bash
pnpm install
pnpm gorsel:tarayici      # Windows/macOS: Chromium'u indirir. Linux'ta gerekmez.
```

## Maç günü postu

1. **Bilgileri doğrula.** Arhaval kuralı: bilgi %100 doğru olmalı.
   - Rakip, maç saati ve turnuva/aşama HLTV maç sayfasından alınır. Saat **Türkiye saatine** çevrilir ve `19.00` biçiminde yazılır.
   - Kadro: HLTV'deki maç kadrosu `pnpm gorsel --liste` çıktısıyla aynı mı? Farklıysa (yeni oyuncu, yedek) DUR ve kullanıcıya söyle. Fotoğrafı olmayan oyuncuyla post çıkmaz.
2. **Yayın:** Arhaval, BBL maçlarında BBL tarafının yayınını yapıyor, BBL için varsayılan `--yayin var`. Başka takımlarda ya da emin değilsen kullanıcıya sor. Kural: yayın yoksa yayın satırı hiç konmaz.
3. **Turnuva satırı:** Büyük harfle yazılır, ayırıcı ` · `. Örnek: `RUSH BRNO 2026 · YARI FİNAL`. Türkçe aşama adı kullanılır: FİNAL, YARI FİNAL, ÇEYREK FİNAL, GRUP AŞAMASI. "Singapur" gibi Türkçeleşmiş yer adları noktasız I ile yazılır: SINGAPUR. "Çok uzun" uyarısı gelirse turnuva adı kısaltılır, aşama kalır.
4. **Rakip logosu:**
   - Listede varsa `--rakip <anahtar>`.
   - Listede yoksa HLTV'deki takım logosu (tercihen SVG) indirilir ve `--rakip-logo dosya.svg --rakip-ad "AD"` ile verilir. Şablon logoyu beyaza çevirir ve ağırlığını eşitler.
   - Logo kalıcı olsun istenirse `gorsel/takimlar/<ad>/logo.png` olarak eklenir, `src/constants/gorsel.ts` içindeki `GORSEL_RAKIPLER` listesine yazılır.
5. **Çiz:**
   ```bash
   pnpm gorsel mac-gunu --takim bbl --rakip sinners --turnuva "RUSH BRNO 2026 · YARI FİNAL" --saat 19.00 --yayin var --cikti post,hikaye
   ```
   Dosyalar `gorsel-cikti/` klasörüne yazılır (git'e girmez). HD için `--cikti post-hd`.
6. **Kontrol et ve teslim et:**
   - Üretilen PNG'yi aç ve gözle kontrol et.
   - Şablon denetimi uyarı verirse dosya yazılmaz. Uyarıyı düzelt (genelde turnuva satırını kısaltmak), denetimi atlatmaya çalışma.
   - Windows'ta dosyaları kullanıcının İndirilenler klasörüne kopyala.

## Kurallar (değişmez)

- Postta "Veri:" ya da kaynak satırı olmaz. Açıklanmamış sponsor adı yazılmaz.
- Logolar beyaz tek renktir. Oyuncu isimleri HLTV'deki yazımla yazılır (leakz, NickyB, MistR).
- Hiçbir görsel kaynağından büyük gösterilmez. Şablon bunu denetler, uyarıyı kapatma.

## Tasarım değişikliği

1. Yalnızca `gorsel/sablonlar/*.html` düzenlenir. Panel bileşenleri tasarım bilmez.
2. `pnpm gorsel ...` ile çiz. Önceki onaylı çıktıyla yan yana koyup karşılaştır.
3. Ayrı bir dalda commit et ve PR aç. Kullanıcı onaylamadan `master`'a itme, canlı panel oradan yayınlanıyor.

## Yeni takım (kadrosuyla)

1. Oyuncu fotoğrafları önce Arhaval fotoğraf havuzuna girer: yüz HLTV'yle karşılaştırılır, isimler iki kaynaktan doğrulanır.
2. 1,4 kat kadrajlar (1120×1168, şeffaf PNG) `gorsel/takimlar/<takim>/oyuncular/` altına konur. Dosya adlarında küçük harf ve `-` kullanılır.
3. Beyaz logo `gorsel/takimlar/<takim>/logo.png` olarak eklenir. Takım `GORSEL_TAKIMLAR` listesine yazılır.
