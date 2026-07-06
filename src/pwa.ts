import { registerSW } from "virtual:pwa-register";

// Service-worker registration + auto-update. The SW is generated with
// registerType "autoUpdate", so when a new build is deployed the waiting SW is
// activated and the page reloads automatically - users don't have to hard
// refresh to escape the old cached bundle.
//
// The catch: a tab only checks for a new SW when it (re)loads, and with hash
// routing in-app navigation is client-side (no reload), so a long-open tab
// would otherwise never notice a deploy. So poll registration.update() to pick
// new builds up within one interval. 30 min balances freshness against
// network noise: each check is a real sw.js fetch to the gateway, and deploys
// are infrequent, so sub-minute polling would hammer it for no benefit. Fresh
// loads and reloads still check immediately regardless of this interval.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60_000;

registerSW({
  immediate: true,
  onRegisteredSW(_swScriptUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      // Swallow transient failures (offline, network blip); the next tick retries.
      void registration.update();
    }, UPDATE_CHECK_INTERVAL_MS);
  },
});
