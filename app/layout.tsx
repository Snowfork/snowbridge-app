import { Analytics } from "@vercel/analytics/react";
import { Footer } from "@/components/Footer";
import { Menu } from "@/components/Menu";
import { TermsOfUse } from "@/components/TermsOfUse";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import "@/styles/overrides.css";
import { Provider } from "jotai";
import Image from "next/image";
import { Metadata } from "next";

import { metadata as meta } from "@/lib/metadata";

export const metadata: Metadata = {
  ...meta,
  icons: [
    {
      rel: "icon",
      url: "/icon.svg",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin />
    <link href="https://fonts.googleapis.com/css2?family=Funnel+Display&display=swap" rel="stylesheet" />
    <body>
    <Provider>
      <main>
        <div className="flex min-h-screen flex-col items-center justify-between p-4 lg:p-24">
          <div className="w-full max-w-5xl md:gap-4 flex flex-col">
            <div className="w-full place-items-center justify-between flex flex-col md:flex-row">
              <div className="flex mb-4 lg:mb-0">
                <Image
                  className="mb-2"
                  src="/icon.svg"
                  width={27}
                  height={27}
                  alt="Snowbridge"
                />
                <h1 className="text-2xl lg:text-2xl px-2 text-light">
                  Snowbridge
                </h1>
              </div>
              <Menu />
            </div>
          </div>
          <div className="w-full max-w-5xl flex place-content-center">
            {children}
          </div>
          <div className="w-full max-w-5xl flex flex-col place-items-center text-sm">
            <Footer />
          </div>
          <Toaster />
          <TermsOfUse />
        </div>
      </main>
    </Provider>
    <Analytics />
    </body>
    </html>
  );
}
