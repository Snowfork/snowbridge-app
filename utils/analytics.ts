"use client";

import posthog from "posthog-js";

// PostHog analytics. Works on a static IPFS host (client -> PostHog endpoint),
// replacing Vercel Analytics. Configure with NEXT_PUBLIC_POSTHOG_KEY (a
// publishable project key, baked into the bundle) and optionally
// NEXT_PUBLIC_POSTHOG_HOST. With no key set (e.g. local dev) everything no-ops.

let initialized = false;
let enabled = false;

// Initialize PostHog once. Idempotent, safe to call from multiple places.
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false, // captured per route in useAnalytics (SPA)
    autocapture: false,
    // Hard-off, independent of the PostHog project setting: a wallet UI must
    // never screen-record (addresses/amounts on screen). Prevents the recorder
    // from even loading.
    disable_session_recording: true,
    disable_surveys: true, // don't load the surveys feature (surveys.js)
    capture_performance: false, // don't load web-vitals / perf capture
    person_profiles: "identified_only",
  });
  enabled = true;
}

// Capture a page view for the current URL (called on each route change).
export function capturePageview(): void {
  initAnalytics();
  if (!enabled) return;
  posthog.capture("$pageview");
}

// Named UI event with optional properties (drop-in for @vercel/analytics track).
export function track(event: string, properties?: unknown): void {
  initAnalytics();
  if (!enabled) return;
  posthog.capture(event, properties as Record<string, unknown> | undefined);
}
