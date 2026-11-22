/**
 * Görsel Stüdyosu API'leri için erişim denetimi.
 * Oturum + aktif kullanıcı + rolün 'visual-studio' sayfa yetkisi (yetki matrisi).
 */

import { userService } from '@/services';
import { permissionService } from '@/services/permission.service';

export type GorselYetkiSonucu = { ok: true } | { ok: false; status: 401 | 403 };

export async function gorselYetkisiniDogrula(): Promise<GorselYetkiSonucu> {
  const user = await userService.getCurrentUser();
  if (!user || !user.is_active) return { ok: false, status: 401 };
  const sayfalar = await permissionService.getAllowedPages(user.role);
  return sayfalar.includes('visual-studio') ? { ok: true } : { ok: false, status: 403 };
}
