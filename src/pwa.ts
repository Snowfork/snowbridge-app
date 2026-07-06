import { registerSW } from "virtual:pwa-register";

// Service-worker registration + auto-update. The SW is generated with
// registerType "autoUpdate", so when a new build is deployed the waiting SW is
// activated and the page reloads automatically - users don't have to hard
// refresh to escape the old cached bundle.
//
// The catch: a tab only checks for a new SW when it (re)loads. A tab left open
// across a deploy would otherwise never notice. So poll registration.update()
// to pick up new builds within one interval instead of never.
const UPDATE_CHECK_INTERVAL_MS = 60_000;

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
