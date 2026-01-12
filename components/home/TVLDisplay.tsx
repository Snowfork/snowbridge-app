"use client";

import { useState, useEffect } from "react";

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
      <div className="glass-sub flex items-center justify-center py-4 px-6 whitespace-nowrap">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-3 bg-white/40 rounded w-28 mx-auto mb-2"></div>
            <div className="h-6 bg-white/40 rounded w-20 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-sub flex items-center justify-center py-4 px-6 whitespace-nowrap border border-red-200/50">
        <div className="text-center">
          <p className="text-red-600/80 text-xs">Unable to load TVL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-sub flex items-center justify-center py-4 px-6 whitespace-nowrap">
      <div className="text-center">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          Total Value Secured
        </p>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
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
