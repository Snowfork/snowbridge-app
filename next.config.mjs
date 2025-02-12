/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // TODO: Next js generates all pages in paralell which hits apis and rate limits.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
