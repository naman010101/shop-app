import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production'
          ? 'https://shop-app-ei63.onrender.com/api/:path*'
          : 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
