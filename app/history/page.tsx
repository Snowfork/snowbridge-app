"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Preserve the hash when redirecting to /activity
    const hash = window.location.hash;
    router.replace(`/activity${hash}`);
  }, [router]);

  return null;
}
