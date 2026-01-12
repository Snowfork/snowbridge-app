"use client";

import Image from "next/image";

export function HighlightSection() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-12 mt-20">
      <div className="relative w-full h-64 md:h-80 lg:h-96">
        {/* Background Image */}
        <Image
          src="/images/ice-blocks.png"
          alt="Ethereal ice blocks illustration"
          fill
          className="object-contain object-right"
          priority
        />

        {/* Content container - empty for now */}
        <div className="relative z-10 h-full flex items-center justify-center p-8">
          {/* Content will go here */}
        </div>
      </div>
    </section>
  );
}
