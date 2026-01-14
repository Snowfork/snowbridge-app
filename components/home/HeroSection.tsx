"use client";

import { GetStartedComponent } from "@/components/transfer/GetStartedComponent";

export function HeroSection() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-12 relative">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12 items-center">
        {/* Left column: Text content */}
        <div className="order-1 xl:order-1 text-center xl:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 leading-tight mb-4">
            Bridge between
            <br />
            Ethereum and Polkadot
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-lg mx-auto xl:mx-0">
            Send tokens across blockchains in a safe, trust-minimized way,
            governed by the Polkadot community.
          </p>
        </div>

        {/* Right column: Transfer widget */}
        <div className="order-2 xl:order-2 flex justify-center xl:justify-end">
          <div id="transfer">
            <GetStartedComponent />
          </div>
        </div>
      </div>
    </section>
  );
}
