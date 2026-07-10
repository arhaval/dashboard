import { redirect } from 'next/navigation';

/**
 * Maçlar / Turnuva modülü panelden kaldırıldı. Sayfa dosyaları duruyor (veri
 * ve entegrasyon korunuyor) ama menüde yok ve doğrudan URL ile de erişilemiyor.
 * Geri açmak için bu layout'u sil + sidebar/permissions kayıtlarını geri ekle.
 */
export default function MatchesRemovedLayout() {
  redirect('/');
}
