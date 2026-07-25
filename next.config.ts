import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default 1MB is too small for course thumbnails, lesson files, and profile
    // photos uploaded through Server Actions.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    // Lets next/image optimize (resize, re-encode, cache) the public course
    // thumbnails served from Supabase Storage, instead of every <Image> having
    // to pass `unoptimized` and download the original file as-is.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
