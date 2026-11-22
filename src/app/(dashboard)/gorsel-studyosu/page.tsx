import { PageShell } from '@/components/layout';
import { GorselStudyosu } from '@/components/gorsel/gorsel-studyosu';

/**
 * Görsel Stüdyosu — Arhaval sosyal medya şablonlarından post üretimi.
 * Yaklaşan maçlar arhaval.com'dan gelir (tarayıcıda okunur); paylaşılacak maçı ekip seçer.
 * Erişim yetki matrisinden ('visual-studio') gelir; düzen (layout) URL düzeyinde denetler.
 */
export default function GorselStudyosuPage() {
  return (
    <PageShell
      title="Görsel Stüdyosu"
      description="Paylaşacağın maçı seç, post kendiliğinden dolsun; önizlemede kontrol et, indir"
    >
      <GorselStudyosu />
    </PageShell>
  );
}
