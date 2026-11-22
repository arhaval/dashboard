import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Görsel Stüdyosu sunucu çizimi: başsız Chromium paketlenmeden Node'dan yüklenir.
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
  // `gorsel/` (şablon, font, zemin, logo, oyuncu fotoğrafı) public/ değil; yalnızca
  // bu iki route'un deploy paketine girer. Chromium'un sıkıştırılmış dosyaları da öyle.
  outputFileTracingIncludes: {
    '/api/gorsel/render': ['./gorsel/**/*', './node_modules/@sparticuz/chromium/bin/**/*'],
    '/api/gorsel/varlik/[...yol]': ['./gorsel/**/*'],
  },
  experimental: {
    serverActions: {
      // Small server-action payloads (e.g. logo image in the sponsor form).
      // Large files (contracts, logo packs) upload directly to Supabase Storage.
      bodySizeLimit: '8mb',
    },
    // Client-side Router Cache: keep visited/prefetched pages for a short window
    // so re-navigating (and back/forward) is instant instead of refetching every
    // click. Mutations still call revalidatePath to bust the cache.
    staleTimes: {
      dynamic: 30,  // dynamic pages stay fresh in the client cache for 30s
      static: 180,
    },
  },
};

export default nextConfig;
