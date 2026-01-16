import type { NextConfig } from "next";

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

export default nextConfig;
