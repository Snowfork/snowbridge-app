"use client";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { capturePageview } from "@/utils/analytics";

// Initializes PostHog and captures a $pageview on first load and on every
// client-side route change (React Router doesn't fire real navigations, so SPA
// page views have to be captured manually).
export function useAnalytics(): void {
  const location = useLocation();
  useEffect(() => {
    capturePageview();
  }, [location.pathname, location.search]);
}
