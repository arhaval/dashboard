import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Small server-action payloads (e.g. logo image in the sponsor form).
      // Large files (contracts, logo packs) upload directly to Supabase Storage.
      bodySizeLimit: '8mb',
    },
  },
};

export default nextConfig;
