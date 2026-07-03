// Make process.env.NEXT_PUBLIC_* readable by the app's call sites in BOTH dev
// and production.
//
// - In production builds Vite statically replaces `process.env.NEXT_PUBLIC_*`,
//   so this is belt-and-suspenders there.
// - In dev that replacement doesn't happen, and vite-plugin-node-polyfills
//   injects a shared `process` shim (this exact module) into every file with an
//   empty `env`. So we read the values from import.meta.env (Vite-native, works
//   in dev) and populate that same shim instance, which every module reads.
//
// Imported first in main.tsx, before any code reads process.env.
// @ts-expect-error - JS shim ships no types
import nodeProcess from "vite-plugin-node-polyfills/shims/process";

const proc = nodeProcess as unknown as {
  env: Record<string, string | undefined>;
};
proc.env = proc.env ?? {};

for (const key of Object.keys(import.meta.env)) {
  if (key.startsWith("NEXT_PUBLIC_")) {
    proc.env[key] = import.meta.env[key] as string;
  }
}
