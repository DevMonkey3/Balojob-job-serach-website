import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Self-contained server for a small VPS or container: node .next/standalone/server.js
  output: "standalone",
  poweredByHeader: false,
  // Titles, descriptions and share-preview tags always go in <head>, for every
  // visitor. By default Next.js sends them late (in the page body) to ordinary
  // browsers and in <head> only to crawlers it recognises. The page cache in
  // front of the app keeps ONE copy of a page for everybody, so the copy a
  // browser fetched would be handed to LINE or Facebook with no preview tags.
  htmlLimitedBots: /.*/,
  // The standalone server gets only what it runs: no uploads, docs, demo data or sources.
  outputFileTracingExcludes: {
    "*": [
      "./storage/**",
      "./docs/**",
      "./db/**",
      "./DEMO-LOGIN.txt",
      "./*.md",
      "./src/app/**",
      "./src/components/**",
      "./src/lib/**",
      "./src/server/**",
      "./prisma/migrations/**",
    ],
  },
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
