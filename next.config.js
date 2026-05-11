/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["jszip", "pg", "bullmq", "ioredis", "playwright", "lighthouse", "@anthropic-ai/sdk"],
  },
};
module.exports = nextConfig;
