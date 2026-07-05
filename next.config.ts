import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean, self-contained server output for the prod Docker image (see Dockerfile) —
  // required since Route Handlers, proxy.ts, and iron-session need a live Node.js
  // server and can no longer be served as a static export.
  output: "standalone",
};

export default nextConfig;
