import { GetStartedComponent } from "@/components/transfer/GetStartedComponent";
import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { TVLDisplay } from "@/components/home/TVLDisplay";
import { ArchitectureSection } from "@/components/home/ArchitectureSection";
import Image from "next/image";

export default function Home() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <div className="flex flex-col items-center justify-center w-full">
          <GetStartedComponent />
          <p className="mt-6 text-center text-l text-gray-500 dark:text-gray-400 font-medium">
            Send tokens between Ethereum and 7+ networks on Polkadot
          </p>

          {/* Description and TVL - two column layout */}
          <div className="mt-20 w-full px-8 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <p className="text-xl text-gray-800 dark:text-gray-100 leading-relaxed text-center md:text-left">
              Snowbridge is a trust-minimized bridge between Ethereum and
              Polkadot. Built and governed by the Polkadot community, it enables
              secure general-purpose messaging and transfer of assets.
            </p>
            <div className="flex justify-center md:justify-end">
              <div>
                <div className="flex gap-4">
                  <TVLDisplay />
                  <div className="glass-sub flex items-center justify-center py-5 px-8 whitespace-nowrap">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Monthly Volume
                      </p>
                      <p className="text-4xl font-bold text-gray-800 dark:text-gray-100">$12M</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explore Apps Section */}
        <section className="mt-24 w-full px-8 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Column 1: Text */}
            <div className="flex flex-col">
              <p className="text-xl text-gray-800 dark:text-gray-100 leading-relaxed">
                Snowbridge powers seamless cross-chain transfers for apps in the
                Polkadot ecosystem.
              </p>
            </div>

            {/* Column 2: Turtle image */}
            <a
              href="https://app.turtle.cool/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative h-32 md:h-48 block overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            >
              <Image
                src="/images/home/turtle.jpg"
                alt="Turtle app"
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </a>

            {/* Column 3: Hydration image */}
            <a
              href="https://app.hydration.net/trade/swap"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative h-32 md:h-48 block overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            >
              <Image
                src="/images/home/hydration.jpg"
                alt="Hydration app"
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </a>
          </div>
        </section>

        {/* Architecture Section */}
        <ArchitectureSection />
      </ContextComponent>
    </MaintenanceBanner>
  );
}
