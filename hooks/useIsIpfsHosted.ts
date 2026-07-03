"use client";

import { useEffect, useState } from "react";

// Detects whether the app is actually being served from an IPFS gateway
// (including a DNSLinked custom domain like staging-app.snowbridge.network).
// IPFS gateways add x-ipfs-path / x-ipfs-roots response headers and expose them
// via CORS, so a HEAD request to the current URL can read them. Returns false
// on localhost, Vercel, or any non-IPFS host.
export function useIsIpfsHosted(): boolean {
  const [isIpfs, setIsIpfs] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(window.location.href, { method: "HEAD" });
        const served =
          res.headers.has("x-ipfs-path") || res.headers.has("x-ipfs-roots");
        if (!cancelled && served) setIsIpfs(true);
      } catch {
        // Network/HEAD failure, treat as not served from IPFS.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return isIpfs;
}
