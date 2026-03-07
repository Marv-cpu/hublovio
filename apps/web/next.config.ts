import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 1. Critical for Monorepo: Allows Next.js to compile shared code */
  transpilePackages: ["@aura/utils", "@aura/types", "@aura/ui"],

  /* 2. Image Configuration */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  /* 3. Experimental/Turbopack features (Optional but helpful) */
  experimental: {
    // This helps Turbopack resolve the workspace packages more reliably
    externalDir: true,
  },
};

export default nextConfig;