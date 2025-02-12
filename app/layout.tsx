import { Analytics } from "@vercel/analytics/react";
import { Footer } from "@/components/Footer";
import { Menu } from "@/components/Menu";
import { TermsOfUse } from "@/components/TermsOfUse";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import "@/styles/overrides.css";
import { Providers } from "./providers";
import Image from "next/image";
import { Metadata } from "next";

import { metadata as meta } from "@/lib/metadata";
import { assetRegistry } from "@/lib/server/assets";

export const metadata: Metadata = {
  ...meta,
  icons: [
    {
      rel: "icon",
      url: "/icon.svg",
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const registry = await assetRegistry();
  if (registry === null) {
    console.error("no registry");
  }
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Funnel+Display&display=swap"
          rel="stylesheet"
        />
        <title>Snowbridge</title>
      </head>
      <body>
        <Providers registry={registry!}>
          <main>
            <div className="flex min-h-screen flex-col items-center justify-between p-4 lg:p-24">
              <div className="w-full max-w-5xl md:gap-4 flex flex-col">
                <div className="w-full place-items-center justify-between flex flex-col md:flex-row">
                  <div className="flex mb-4 lg:mb-0">
                    <Image
                      src="/images/logo-blue.png"
                      width={58}
                      height={58}
                      alt="Snowbridge"
                    />
                    <h1 className="text-3xl font-semibold lg:text-4xl px-2 main-heading ml-2">
                      Snowbridge
                    </h1>
                  </div>
                  <Menu />
                </div>
              </div>
              <div className="w-full max-w-5xl flex place-content-center mt-6">
                {children}
              </div>
              <div className="w-full max-w-5xl flex flex-col place-items-center text-sm mt-6">
                <Footer />
              </div>
              <Toaster />
              <TermsOfUse />
            </div>
          </main>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
