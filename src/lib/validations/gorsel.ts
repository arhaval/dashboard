/**
 * Görsel Stüdyosu - Zod şemaları.
 * Aynı şema hem formda (istemci) hem /api/gorsel/render'da (sunucu) kullanılır.
 */

import { z } from 'zod';
import { GORSEL_LOGO_AZAMI_URL } from '@/constants/gorsel';

/** `gorsel/` köküne göre güvenli göreli yol: yalnızca küçük harf, rakam, - _ / ve bilinen uzantılar. */
export const gorselVarlikYoluSchema = z
  .string()
  .regex(/^(takimlar|ortak)\/[a-z0-9_\-/]+\.(png|svg|webp)$/, 'Geçersiz görsel yolu')
  .refine((v) => !v.includes('..') && !v.includes('//'), 'Geçersiz görsel yolu');

/** Formdan yüklenen logo: PNG, SVG ya da WebP data URL. */
export const gorselYuklenenLogoSchema = z
  .string()
  .max(GORSEL_LOGO_AZAMI_URL, 'Logo dosyası en fazla 2 MB olabilir')
  .regex(/^data:image\/(png|svg\+xml|webp);base64,[A-Za-z0-9+/=]+$/, 'Logo PNG, SVG ya da WebP olmalı');

export const gorselLogoSchema = z.union([gorselVarlikYoluSchema, gorselYuklenenLogoSchema]);

export const macGunuVeriSchema = z.object({
  format: z.enum(['post', 'hikaye']),
  turnuva: z.string().trim().min(1, 'Turnuva satırı boş olamaz').max(48, 'Turnuva satırı en fazla 48 karakter'),
  saat: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3])[.:][0-5]\d$/, 'Saat 19.00 biçiminde olmalı')
    .transform((v) => v.replace(':', '.')),
  /** KURAL: maçı Arhaval yayınlamıyorsa false; yayın satırı hiç konmaz. */
  yayin: z.boolean(),
  takim: z.object({
    ad: z.string().trim().min(1).max(40),
    logo: gorselLogoSchema,
    oyuncular: z
      .array(z.object({ nick: z.string().trim().min(1).max(16), foto: gorselVarlikYoluSchema }))
      .length(5, 'Kadroda 5 oyuncu olmalı'),
  }),
  rakip: z.object({
    ad: z.string().trim().min(1, 'Rakip adı boş olamaz').max(40),
    logo: gorselLogoSchema,
  }),
});

export const gorselRenderIstekSchema = z.object({
  sablon: z.literal('mac-gunu'),
  cikti: z.enum(['post', 'post-hd', 'hikaye']),
  veri: macGunuVeriSchema,
});

export type MacGunuVeri = z.infer<typeof macGunuVeriSchema>;
export type GorselRenderIstek = z.infer<typeof gorselRenderIstekSchema>;
