import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
  customWorkerSrc: "src/worker",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Silence Turbopack warning — next-pwa webpack config applies at build time only
  turbopack: {},
};

export default withPWA(nextConfig);
