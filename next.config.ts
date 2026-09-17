import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Bắt buộc có để Capacitor lấy thư mục out làm gốc
  images: {
    unoptimized: true,
  },
};

export default nextConfig;