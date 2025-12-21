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

    // Initial fetch
    fetchTVL();

    // Refresh every 5 minutes
    const interval = setInterval(fetchTVL, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-48 mx-auto mb-2"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-sm">
            Unable to load TVL data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
          Total Value Locked (TVL)
        </h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {tvl !== null ? (
            <span>
              $
              {tvl.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          ) : (
            <span className="text-gray-500">N/A</span>
          )}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Across all Snowbridge networks
        </p>
      </div>
    </div>
  );
}
