"use client";

import useSWR from "swr";
import Image from "next/image";
import { fetchTvlUsd } from "@/lib/client/dashboardStats";

export function TVLDisplay() {
  // SWR dedups concurrent requests and caches the result, so the upstream
  // dashboard is hit at most once per dedupingInterval across mounts (the
  // deleted /api route used a 5-min shared edge cache).
  const {
    data: tvl,
    error,
    isLoading,
  } = useSWR("dashboard:tvl", fetchTvlUsd, {
    dedupingInterval: 300_000,
    revalidateOnFocus: false,
  });

  if (isLoading) {
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
          {tvl != null ? (
            <span>
              $
              {tvl >= 1_000_000
                ? `${(tvl / 1_000_000).toFixed(1)}M`
                : tvl.toLocaleString("en-US", {
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
