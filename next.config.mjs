// Tags the sr25519-raw chunk as already-minimized so Next's internal
// TerserPlugin skips it (it ignores `exclude` but honors `info.minimized`).
class SkipMinifySr25519 {
  apply(compiler) {
    compiler.hooks.compilation.tap("SkipMinifySr25519", (compilation) => {
      const { Compilation } = compiler.webpack;
      compilation.hooks.processAssets.tap(
        {
          name: "SkipMinifySr25519",
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          for (const name of Object.keys(assets)) {
            if (!name.includes("sr25519-raw")) continue;
            const asset = compilation.getAsset(name);
            if (!asset) continue;
            compilation.updateAsset(name, asset.source, {
              ...asset.info,
              minimized: true,
            });
          }
        },
      );
    });
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
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

    // Dev client builds skip minification and splitChunks, so there's
    // nothing to guard against.
    if (dev) return config;

    // Production client build: sr25519 must be bundled (browser can't
    // `require` it), but the minifier mangles `${'\0'}0` into `\00` inside
    // a template literal. Isolate it into its own chunk and flag that
    // chunk as pre-minimized so Next's TerserPlugin leaves it alone.
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
    config.plugins.push(new SkipMinifySr25519());

    return config;
  },
};

export default nextConfig;
