import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin tracing to this directory so standalone output lands at
  // .next/standalone/server.js regardless of monorepo markers above us
  // (the Dockerfile COPY paths depend on this).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
