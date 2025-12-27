import { GetStartedComponent } from "@/components/transfer/GetStartedComponent";
import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { TVLDisplay } from "@/components/home/TVLDisplay";
import Image from "next/image";

export default function Home() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <div className="flex flex-col items-center justify-center w-full">
          <GetStartedComponent />
          <p className="mt-6 text-center text-l text-gray-500 font-medium">
            Send tokens between Ethereum and 7+ networks on Polkadot
          </p>

          {/* Description and TVL - two column layout */}
          <div className="mt-20 w-full px-8 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <p className="text-xl text-gray-800 leading-relaxed text-center md:text-left">
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
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Monthly Volume
                      </p>
                      <p className="text-4xl font-bold text-gray-800">$12M</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <div className="mt-16 w-full flex justify-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-gray-400/50 to-transparent" />
        </div>

        {/* Explore Apps Section */}
        <section className="mt-12 w-full px-8 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Column 1: Text */}
            <div className="flex flex-col">
              <p className="text-xl text-gray-800 leading-relaxed">
                Snowbridge powers seamless cross-chain transfers for many apps
                in the Polkadot ecosystem.
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

        {/* Section Divider */}
        <div className="mt-16 w-full flex justify-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-gray-400/50 to-transparent" />
        </div>

        {/* Architecture Section */}
        <section className="mt-12 w-full px-8 md:px-12">
          <h2 className="text-2xl font-semibold mb-6 text-center text-gray-700">
            How It Works
          </h2>
          <ul className="mb-6 space-y-3 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>
                Secure interoperability by exchanging cryptographically-secure
                proofs of finality between on-chain light clients
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>
                Offchain relayers are untrusted and have no capability to forge
                messages. Anyone can spin up their own relayers.
              </span>
            </li>
          </ul>
          <div className="glass-sub p-6 rounded-2xl">
            <Image
              src="/images/architecture.svg"
              alt="Snowbridge Architecture - showing consensus and message relayers between Ethereum and Polkadot"
              width={1054}
              height={846}
              className="w-full h-auto"
            />
          </div>
        </section>

        {/* Section Divider */}
        <div className="mt-16 w-full flex justify-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-gray-400/50 to-transparent" />
        </div>

        {/* Governance Section */}
        <section className="mt-12 w-full px-8 md:px-12">
          <h2 className="text-2xl font-semibold mb-6 text-center text-gray-700">
            Governance
          </h2>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>
                Snowbridge is a system bridge that is part of the{" "}
                <a
                  href="https://github.com/paritytech/polkadot-sdk/tree/master/bridges/snowbridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Polkadot SDK
                </a>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>
                Governed by the Polkadot community using{" "}
                <a
                  href="https://wiki.polkadot.com/learn/learn-polkadot-opengov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  OpenGov
                </a>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>
                Snowfork, Inc, builds and maintains the bridge and is funded by
                Polkadot Treasury grants.
              </span>
            </li>
          </ul>
        </section>
      </ContextComponent>
    </MaintenanceBanner>
  );
}
