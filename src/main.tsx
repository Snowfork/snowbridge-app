import "./env-bootstrap"; // must run before any code reads process.env
import "./pwa"; // register the service worker + poll for new builds
import React, { lazy } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "@/styles/globals.css";
import "@/styles/overrides.css";
import { RootLayout } from "./RootLayout";

// Route components are the existing Next page modules (default exports). They
// remain in app/ for now; next/* imports inside them resolve to the Vite shims
// (see vite.config.ts aliases). Lazy-loaded so each route is its own chunk and
// the initial bundle stays smaller (RootLayout's <Suspense> shows the
// fallback while a route loads).
const Home = lazy(() => import("@/app/page"));
const Send = lazy(() => import("@/app/send/page"));
const Activity = lazy(() => import("@/app/activity/page"));
const HistoryRedirect = lazy(() => import("@/app/history/page"));
const Governance = lazy(() => import("@/app/governance/page"));
const Kusama = lazy(() => import("@/app/kusama/page"));
const TxComplete = lazy(() => import("@/app/txcomplete/page"));
const LocalTxComplete = lazy(() => import("@/app/localtxcomplete/page"));
const Blocked = lazy(() => import("@/app/blocked/page"));
const NotFound = lazy(() => import("@/app/not-found"));

// Hash routing (URLs like /#/send) so the app works on any IPFS gateway: the
// server only ever serves "/", and routing happens client-side after load.
// Path routing 404s on hard-refresh/deep-link on gateways that don't rewrite
// unknown paths to index.html (e.g. the Filebase gateway ignores _redirects).
const router = createHashRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/send", element: <Send /> },
      { path: "/activity", element: <Activity /> },
      { path: "/history", element: <HistoryRedirect /> },
      { path: "/governance", element: <Governance /> },
      { path: "/kusama", element: <Kusama /> },
      { path: "/txcomplete", element: <TxComplete /> },
      { path: "/localtxcomplete", element: <LocalTxComplete /> },
      { path: "/blocked", element: <Blocked /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
