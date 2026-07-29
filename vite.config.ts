/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import fs from "node:fs";

// SPA fallback for static / IPFS hosting so a direct deep link (e.g. /activity)
// returns the app shell instead of a hard 404; React Router then resolves the
// route client-side. Emits two things:
//   - _redirects: the IPFS-native SPA rule, honored by subdomain / DNSLink
//     gateways (this is what makes deep links work on IPFS).
//   - 404.html: a copy of index.html for static hosts that use that convention.
function spaFallback() {
  return {
    name: "spa-fallback",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist");
      const index = path.join(outDir, "index.html");
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(outDir, "404.html"));
        fs.writeFileSync(
          path.join(outDir, "_redirects"),
          "/*  /index.html  200\n",
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env files (incl. .env.local). The app reads config as
  // `process.env.NEXT_PUBLIC_*`; we keep those call sites untouched and
  // statically replace them at build time via `define`.
  const env = loadEnv(mode, process.cwd(), "");
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("NEXT_PUBLIC_")) {
      // Static replacement for production builds.
      define[`process.env.${key}`] = JSON.stringify(value);
    }
  }

  return {
    define,
    // Expose NEXT_PUBLIC_* on import.meta.env (works in dev AND build, unlike
    // `define` for process.env.* which only applies at build). env-bootstrap.ts
    // copies these into process.env at runtime for the app's call sites.
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [
      react(),
      // @polkadot / @reown(WalletConnect) / ethers expect Node globals
      // (Buffer, process, global) in the browser.
      nodePolyfills({
        globals: { Buffer: true, global: true, process: true },
        protocolImports: true,
      }),
      VitePWA({
        registerType: "autoUpdate",
        // Registration is handled in src/pwa.ts (via virtual:pwa-register) so we
        // can poll for updates; don't also auto-inject a registerSW script.
        injectRegister: null,
        includeAssets: ["icon.svg", "icon.png"],
        workbox: {
          // The web3 deps still produce a chunk above the 2 MiB default even
          // after route splitting; precache it.
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        manifest: {
          name: "Snowbridge",
          short_name: "Snowbridge",
          description:
            "Bridge tokens between Ethereum and Polkadot in a trust-minimized way.",
          start_url: "/",
          display: "standalone",
          theme_color: "#0b1020",
          background_color: "#0b1020",
          icons: [
            {
              src: "/icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
            { src: "/icon.png", sizes: "32x32", type: "image/png" },
          ],
        },
      }),
      spaFallback(),
    ],
    resolve: {
      // Force single copies to avoid duplicate-instance bugs (React useContext
      // null; buffer-shim resolution).
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "bn.js",
        "buffer",
        "@polkadot/util",
        "@polkadot/api",
      ],
      alias: {
        // Shim Next-only modules so the existing component source resolves
        // under Vite without edits (see src/shims/*).
        "next/navigation": path.resolve(
          __dirname,
          "src/shims/next-navigation.tsx",
        ),
        "next/link": path.resolve(__dirname, "src/shims/next-link.tsx"),
        "next/image": path.resolve(__dirname, "src/shims/next-image.tsx"),
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      target: "esnext", // top-level await + wasm in the crypto deps
      outDir: "dist",
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
    },
  };
});
