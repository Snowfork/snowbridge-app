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
      <div className="glass-sub flex items-center justify-center py-5 px-8">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-white/40 rounded w-32 mx-auto mb-3"></div>
            <div className="h-8 bg-white/40 rounded w-24 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-sub flex items-center justify-center py-5 px-8 border border-red-200/50">
        <div className="text-center">
          <p className="text-red-600/80 text-sm">Unable to load TVL data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-sub flex items-center justify-center py-5 px-8">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
          Total Value Secured
        </p>
        <p className="text-4xl font-bold text-gray-800">
          {tvl !== null ? (
            <span>${(tvl / 1_000_000).toFixed(1)}M</span>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </p>
      </div>
    </div>
  );
}
