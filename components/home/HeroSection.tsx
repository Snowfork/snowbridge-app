"use client";

import { BridgeInfoContext } from "@/app/providers";
import { useContext, Suspense } from "react";
import { Card, CardContent } from "../ui/card";
import { GetStartedForm } from "./GetStartedForm";
import { SnowflakeLoader } from "../SnowflakeLoader";

export function HeroSection() {
  const { registry, routes } = useContext(BridgeInfoContext)!;
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
            <Card className="w-full max-w-[min(38rem,calc(100vw-2rem))] glass border-none">
              <CardContent>
                <Suspense fallback={<Loading />}>
                  <GetStartedForm assetRegistry={registry} routes={routes} />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
const Loading = () => {
  return <SnowflakeLoader size="md" />;
};
