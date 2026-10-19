import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Build workers. Unset = one per CPU. On a machine with little free memory
    // (e.g. a laptop also running the dev server) build with NEXT_BUILD_CPUS=2.
    cpus: Number(process.env.NEXT_BUILD_CPUS) || undefined,
    // Résumé / photo uploads go through a server action (10 MB files + multipart overhead).
    serverActions: { bodySizeLimit: "11mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
