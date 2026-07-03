"use client";

import { useLocation } from "react-router-dom";

// Returns the current URL hash (without the leading '#'), or null when absent.
// Reads it from React Router's location so it reacts to in-app navigation
// (router.push("#...")) and browser back/forward, neither of which fires a
// native `hashchange` event (React Router navigates via history.pushState).
export const useWindowHash = () => {
  const { hash } = useLocation();
  return hash ? hash.replace(/^#/, "") : null;
};
