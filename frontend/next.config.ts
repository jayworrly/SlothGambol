import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to acknowledge we're using webpack
  turbopack: {},
  webpack: (config) => {
    // Required for Web3 packages
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      "@react-native-async-storage/async-storage": false,
    };

    // Handle pino and other Node.js specific packages
    config.externals.push("pino-pretty", "encoding");

    return config;
  },
};

export default nextConfig;
