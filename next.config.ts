import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Certificate PDF rendering needs the real puppeteer-core/@sparticuz/chromium
  // binaries at runtime — don't let the bundler try to inline them.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // serverExternalPackages alone keeps @sparticuz/chromium out of the JS
  // bundle, but Vercel's output file tracing (@vercel/nft) only follows
  // static import/require/fs calls — it never sees the package's own
  // runtime fs.readdirSync() over its bin/ directory, so the compressed
  // Chromium binary silently gets dropped from the deployed function and
  // every certificate render fails with "input directory .../bin does not
  // exist". This forces it back in. See: https://github.com/Sparticuz/chromium#bundler-configuration
  outputFileTracingIncludes: {
    "/*": ["node_modules/@sparticuz/chromium/bin/**/*"],
  },
  experimental: {
    // Default 1MB is too small for course thumbnails, lesson files, and profile
    // photos uploaded through Server Actions.
    serverActions: {
      bodySizeLimit: "10mb",
    },
    webVitalsAttribution: ["LCP", "CLS"],
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
