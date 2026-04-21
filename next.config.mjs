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
      return config;
    }

    // Client build: sr25519 must be bundled (browser can't `require` it),
    // but the minifier mangles `${'\0'}0` into `\00` inside a template
    // literal. Isolate it into its own chunk and exclude that chunk from
    // the minimizer so the source ships un-minified but intact.
    config.optimization.splitChunks.cacheGroups = {
      ...config.optimization.splitChunks.cacheGroups,
      sr25519: {
        test: /[\\/]node_modules[\\/]@scure[\\/]sr25519[\\/]/,
        name: "sr25519-raw",
        chunks: "all",
        enforce: true,
        priority: 100,
      },
    };

    for (const m of config.optimization.minimizer) {
      if (m && m.options) {
        m.options.exclude = /sr25519-raw/;
      }
    }

    return config;
  },
};

export default nextConfig;
