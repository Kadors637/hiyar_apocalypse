import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // ISR ve HMR ile ilgili sorunları çözmek için ek yapılandırmalar
  experimental: {
    // Turbopack ile ilgili sorunları çözmek için
    turbo: {
      resolveAlias: {
        // Modül çözümleme sorunlarını gidermek için
        '@/components': './components'
      }
    },
  },
  // Webpack yapılandırması
  webpack: (config, { isServer }) => {
    // İstemci tarafında Pixi.js ile ilgili sorunları çözmek için
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
