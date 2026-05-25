import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8080/:path*" },
      { source: "/ws", destination: "http://localhost:8080/ws" },
      { source: "/ws/live", destination: "http://localhost:8080/ws/live" },
    ];
  },
};

export default nextConfig;
