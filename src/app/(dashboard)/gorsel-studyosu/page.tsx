import { PageShell } from '@/components/layout';
import { GorselStudyosu } from '@/components/gorsel/gorsel-studyosu';

/**
 * Görsel Stüdyosu — Arhaval sosyal medya şablonlarından post üretimi.
 * Erişim yetki matrisinden ('visual-studio') gelir; düzen (layout) URL düzeyinde denetler.
 */
export default function GorselStudyosuPage() {
  return (
    <PageShell
      title="Görsel Stüdyosu"
      description="Şablonu doldur, önizlemede kontrol et, Instagram'a hazır dosyayı indir"
    >
      <GorselStudyosu />
    </PageShell>
  );
}
