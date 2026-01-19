import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Serwist adds a webpack configuration for service worker bundling.
// Next.js 16 uses Turbopack by default for all builds, but Serwist doesn't support Turbopack.
// The build script uses "next build --webpack" to opt out of Turbopack.
// See: https://github.com/serwist/serwist/issues/54
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable during development (Turbopack doesn't support Serwist yet)
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // User-provided recipe images are rendered with unoptimized={true}
    // to avoid SSRF risks from Next.js image optimization fetching arbitrary URLs.
    // Only allow images from our own domain for any optimized images.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fitstreak.app",
      },
    ],
  },
};

export default withSerwist(nextConfig);
