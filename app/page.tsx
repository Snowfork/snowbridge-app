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
          <p className="mt-4 text-center text-gray-500">
            Send tokens between Ethereum and 7+ networks on Polkadot.
          </p>

          {/* TVL Display */}
          <div className="mt-8 w-full max-w-md">
            <TVLDisplay />
          </div>
        </div>

        {/* Explore Apps Section */}
        <section className="mt-16 w-full max-w-4xl mx-auto px-8 md:px-12">
          <h2 className="text-3xl font-semibold mb-8 text-center">
            Explore Apps Powered by Snowbridge
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Column 1: Text */}
            <div className="flex flex-col">
              <h3 className="text-lg font-medium mb-2">
                Snowbridge powers seamless cross-chain transfers for these apps.
              </h3>
            </div>

            {/* Column 2: Turtle image */}
            <a
              href="https://app.turtle.cool/"
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-32 md:h-48 block overflow-hidden rounded-2xl"
            >
              <Image
                src="/images/home/turtle.jpg"
                alt="Turtle app"
                fill
                className="object-cover"
              />
            </a>

            {/* Column 3: Hydration image */}
            <a
              href="https://app.hydration.net/trade/swap"
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-32 md:h-48 block overflow-hidden rounded-2xl"
            >
              <Image
                src="/images/home/hydration.jpg"
                alt="Hydration app"
                fill
                className="object-cover"
              />
            </a>
          </div>
        </section>
      </ContextComponent>
    </MaintenanceBanner>
  );
}
