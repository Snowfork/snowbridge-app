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
import { assetRegistryFor } from "@snowbridge/registry";
import { getEnvironmentName } from "@/lib/snowbridge";
import { BackgroundSnowfall } from "@/components/BackgroundSnowfall";

export const maxDuration = 90;
export const revalidate = 43_200; // 12 hours: 60 * 60 * 12

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
  const registry = assetRegistryFor(getEnvironmentName());
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
        <BackgroundSnowfall />
        <Providers registry={registry}>
          <main className="flex min-h-screen flex-col relative z-10">
            <header className="w-full px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
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
            </header>
            <div className="flex-1 w-full px-6 py-1">
              {children}
            </div>
            <footer className="w-full px-6 py-6 flex flex-col items-center text-sm">
              <Footer />
            </footer>

            <Toaster />
            <TermsOfUse />
          </main>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
