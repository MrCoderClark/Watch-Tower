import path from "node:path";
import type { NextConfig } from "next";

// Monorepo: npm workspaces hoist deps to the repo root. Point Turbopack there
// so it walks up to find @watchtower/browser (symlinked from sdks/watchtower-js).
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
