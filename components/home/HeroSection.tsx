"use client";

import { GetStartedComponent } from "@/components/transfer/GetStartedComponent";

export function HeroSection() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-12 relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left column: Text content */}
        <div className="order-2 lg:order-1">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 leading-tight mb-4">
            Bridge between
            <br />
            Ethereum and Polkadot.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-lg">
            Send tokens across blockchains in a safe, trust-minimized way,
            governed by the Polkadot community.
          </p>

          {/* Compact inline stats */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 bg-white/40 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-sm text-gray-500 dark:text-gray-400">Monthly volume</span>
              <span className="font-bold text-gray-800 dark:text-gray-100">$12M</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/40 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-sm text-gray-500 dark:text-gray-400">TVL</span>
              <span className="font-bold text-gray-800 dark:text-gray-100">$50M+</span>
            </div>
          </div>

        </div>

        {/* Right column: Transfer widget */}
        <div className="order-1 lg:order-2">
          <div id="transfer">
            <GetStartedComponent />
          </div>
        </div>
      </div>

    </section>
  );
}
