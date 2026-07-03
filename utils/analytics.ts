"use client";

import posthog from "posthog-js";

// Drop-in replacement for @vercel/analytics `track()`. Sends UI events (transfer
// attempts/completions, validation + funnel events) to PostHog, which works on a
// static IPFS host (client -> PostHog endpoint), unlike Vercel Analytics which
// only worked when hosted on Vercel.
//
// Configure with NEXT_PUBLIC_POSTHOG_KEY (a publishable project key, baked into
// the bundle) and optionally NEXT_PUBLIC_POSTHOG_HOST. With no key set (e.g.
// local dev), track() is a no-op, matching the old off-Vercel behavior.

let initialized = false;
let enabled = false;

function ensureInit(): boolean {
  if (initialized) return enabled;
  initialized = true;

  if (typeof window === "undefined") return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
    autocapture: false,
    person_profiles: "identified_only",
  });
  enabled = true;
  return true;
}

export function track(event: string, properties?: unknown): void {
  if (!ensureInit()) return;
  posthog.capture(event, properties as Record<string, unknown> | undefined);
}
