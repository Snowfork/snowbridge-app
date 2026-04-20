/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");

    if (isServer) {
      // Externalize all @polkadot/* and @scure/sr25519 for the server build.
      // 1. Prevents @polkadot/util-crypto wasm init from running inside
      //    webpack's bundled output during SSR page-data collection.
      // 2. Avoids Terser mangling a valid `${'\0'}` expression in
      //    @scure/sr25519 into an illegal octal escape (`\00`) inside a
      //    template literal.
      config.externals.push(/^@polkadot\/.*$/, "@scure/sr25519");
    }

    return config;
  },
};

export default nextConfig;
