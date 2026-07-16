import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default 1MB is too small for course thumbnails, lesson files, and profile
    // photos uploaded through Server Actions.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
