import { PageShell } from '@/components/layout';
import { GorselStudyosu } from '@/components/gorsel/gorsel-studyosu';
import { gorselMacService } from '@/services/gorsel-mac.service';

export const dynamic = 'force-dynamic';

/**
 * Görsel Stüdyosu — Arhaval sosyal medya şablonlarından post üretimi.
 * Yaklaşan maçlar arhaval.com'dan gelir; paylaşılacak maçı ekip seçer.
 * Erişim yetki matrisinden ('visual-studio') gelir; düzen (layout) URL düzeyinde denetler.
 */
export default async function GorselStudyosuPage() {
  const { maclar, hata } = await gorselMacService.yaklasanlar();
  return (
    <PageShell
      title="Görsel Stüdyosu"
      description="Paylaşacağın maçı seç, post kendiliğinden dolsun; önizlemede kontrol et, indir"
    >
      <GorselStudyosu maclar={maclar} maclarHatasi={hata} />
    </PageShell>
  );
}
