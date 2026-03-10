"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { TVLDisplay } from "./TVLDisplay";

interface VolumeByMonthResponse {
  success: boolean;
  averageVolumeUsd?: number | null;
  data?: Array<{ month: string; volumeUsd: number }>;
  error?: string;
}

function MonthlyVolumeDisplay() {
  const [averageVolume, setAverageVolume] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVolume() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/volume-by-month");
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const result: VolumeByMonthResponse = await response.json();
        if (result.success && typeof result.averageVolumeUsd === "number") {
          setAverageVolume(result.averageVolumeUsd);
        } else {
          throw new Error(result.error || "Failed to fetch monthly volume");
        }
      } catch (err) {
        console.error("Error fetching monthly volume:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchVolume();
  }, []);

  if (loading) {
    return (
      <div className="glass-sub relative overflow-hidden flex items-start justify-start py-8 px-6 md:py-10 md:px-10 w-full md:min-w-[280px] min-h-[120px] md:min-h-[140px] rounded-2xl">
        <Image
          src="/images/wave.png"
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
      <div className="glass-sub relative overflow-hidden flex items-start justify-start py-8 px-6 md:py-10 md:px-10 w-full md:min-w-[280px] min-h-[120px] md:min-h-[140px] rounded-2xl border border-red-200/50">
        <Image
          src="/images/wave.png"
          alt=""
          width={100}
          height={100}
          className="absolute -right-2 -bottom-2 opacity-20"
        />
        <div className="text-left relative z-10">
          <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Monthly Volume
          </p>
          <p className="text-red-600/80 text-base">Unable to load</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-sub relative overflow-hidden flex items-start justify-start py-8 px-6 md:py-10 md:px-10 w-full md:min-w-[280px] min-h-[120px] md:min-h-[140px] rounded-2xl">
      <Image
        src="/images/wave.png"
        alt=""
        width={100}
        height={100}
        className="absolute -right-2 -bottom-2 opacity-20"
      />
      <div className="text-left relative z-10">
        <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Monthly Volume
        </p>
        <p className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100">
          {averageVolume !== null ? (
            <span>
              $
              {averageVolume >= 1_000_000
                ? `${(averageVolume / 1_000_000).toFixed(1)}M`
                : averageVolume.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">N/A</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function HighlightSection() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-12 mt-12 md:mt-20">
      <div className="relative w-full flex flex-col lg:flex-row items-center">
        {/* Stats cards and dashboard link */}
        <div className="flex flex-col gap-4 md:gap-6 z-10 lg:flex-1 justify-center w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
            <TVLDisplay />
            <MonthlyVolumeDisplay />
          </div>
          <Link
            href="https://dashboard.snowbridge.network/"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-sub relative overflow-hidden flex items-start justify-start py-8 px-6 md:py-10 md:px-10 w-full md:min-w-[280px] min-h-[120px] md:min-h-[140px] rounded-2xl transition-opacity hover:opacity-90 focus:opacity-90"
          >
            <div className="text-left relative z-10">
              <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Dashboard
              </p>
              <p className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
                View full stats →
              </p>
            </div>
          </Link>
        </div>

        {/* Ice blocks image on the right */}
        <div className="relative lg:flex-1 h-48 md:h-80 lg:h-96 w-full mt-6 lg:mt-0">
          <Image
            src="/images/ice-blocks.png"
            alt="Ethereal ice blocks illustration"
            fill
            className="object-contain object-center lg:object-right"
            priority
          />
        </div>
      </div>
    </section>
  );
}
