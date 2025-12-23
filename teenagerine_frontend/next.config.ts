import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'https',
        hostname: 'tangerineluxury.com',
      },
      {
        protocol: 'https',
        hostname: 'www.tangerineluxury.com'
      },
      {
        protocol: 'http',
        hostname: '91.203.135.152',
      }
    ],
  },
};

export default nextConfig;
