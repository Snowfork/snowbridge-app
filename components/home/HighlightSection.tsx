"use client";

import Image from "next/image";
import { TVLDisplay } from "./TVLDisplay";

function MonthlyVolumeDisplay() {
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
          $12M
        </p>
      </div>
    </div>
  );
}

export function HighlightSection() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-12 mt-12 md:mt-20">
      <div className="relative w-full flex flex-col lg:flex-row items-center">
        {/* Stats cards centered on the left */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 z-10 lg:flex-1 justify-center w-full sm:w-auto">
          <TVLDisplay />
          <MonthlyVolumeDisplay />
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
