import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // PDF.js resolves its Node fallback worker relative to its own package.
  // Keeping it external prevents Turbopack from relocating `pdf.mjs` without
  // the adjacent `pdf.worker.mjs` file.
  serverExternalPackages: ["pdfjs-dist"],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
