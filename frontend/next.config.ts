import type { NextConfig } from "next";

const backendURL = process.env.BACKEND_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendURL}/:path*` },
      { source: "/ws", destination: `${backendURL}/ws` },
      { source: "/ws/live", destination: `${backendURL}/ws/live` },
    ];
  },
};

export default nextConfig;
