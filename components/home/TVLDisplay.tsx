"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface TVLData {
  success: boolean;
  data?: {
    result?: {
      rows?: Array<{
        total_value_usd?: number;
        [key: string]: any;
      }>;
    };
  };
  error?: string;
}

export function TVLDisplay() {
  const [tvl, setTvl] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTVL() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/portfolio-value");

        if (!response.ok) {
          throw new Error(`Failed to fetch TVL: ${response.status}`);
        }

        const result: TVLData = await response.json();

        if (result.success && result.data) {
          // Extract the total value from the Dune query result
          const totalValue = result.data.result?.rows?.[0]?.total_value_usd;

          if (typeof totalValue === "number") {
            setTvl(totalValue);
          } else {
            console.warn("TVL value not found in response", result.data);
            setTvl(null);
          }
        } else {
          throw new Error(result.error || "Failed to fetch TVL data");
        }
      } catch (err) {
        console.error("Error fetching TVL:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchTVL();
  }, []);

  if (loading) {
    return (
      <div className="glass-sub relative overflow-hidden flex items-start justify-start py-8 px-6 md:py-10 md:px-10 w-full md:min-w-[320px] min-h-[120px] md:min-h-[140px] rounded-2xl">
        <Image
          src="/images/vault.png"
          alt=""
          width={100}
          height={100}
          className="absolute -right-2 -bottom-2 opacity-20"
        />
        <div className="text-left relative z-10">
          <div className="animate-pulse">
            <div className="h-5 bg-white/40 rounded w-36 mb-3"></div>
            <div className="h-12 bg-white/40 rounded w-28"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-sub relative overflow-hidden flex items-start justify-start py-8 px-6 md:py-10 md:px-10 w-full md:min-w-[320px] min-h-[120px] md:min-h-[140px] rounded-2xl border border-red-200/50">
        <Image
          src="/images/vault.png"
          alt=""
          width={100}
          height={100}
          className="absolute -right-2 -bottom-2 opacity-20"
        />
        <div className="text-left relative z-10">
          <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Total Value Secured
          </p>
          <p className="text-red-600/80 text-base">Unable to load</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-sub relative overflow-hidden flex items-start justify-start py-8 px-6 md:py-10 md:px-10 w-full md:min-w-[320px] min-h-[120px] md:min-h-[140px] rounded-2xl">
      <Image
        src="/images/vault.png"
        alt=""
        width={100}
        height={100}
        className="absolute -right-2 -bottom-2 opacity-20"
      />
      <div className="text-left relative z-10">
        <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Total Value Secured
        </p>
        <p className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100">
          {tvl !== null ? (
            <span>${(tvl / 1_000_000).toFixed(1)}M</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">N/A</span>
          )}
        </p>
      </div>
    </div>
  );
}
