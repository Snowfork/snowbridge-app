import { Analytics } from "@vercel/analytics/react";
import { BridgeStatus } from "@/components/BridgeStatus";
import { ContextComponent } from "@/components/Context";
import { Footer } from "@/components/Footer";
import { Menu } from "@/components/Menu";
import { TermsOfUse } from "@/components/TermsOfUse";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/cn";
import "@/styles/globals.css";
import { Provider } from "jotai";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snowbridge",
  description: "The Ethereum Polkadot bridge.",
  icons: [
    {
      rel: "icon",
      url: "/app/icon.svg",
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
      <body className={cn(inter.className)}>
        <Provider>
          <main>
            <div className="text-center bg-yellow-200">
              You may not see your bridged assets in your Wallet yet - support
              in SubWallet, Talisman and Nova is coming soon. Meanwhile, you can
              check your balance on this page.
            </div>
            <div className="flex min-h-screen flex-col items-center justify-between p-4 lg:p-24">
              <div className="w-full max-w-5xl md:gap-4 flex flex-col">
                <div className="w-full place-items-center justify-between flex flex-col md:flex-row">
                  <div className="flex mb-4 lg:mb-0">
                    <Image
                      className="mb-2"
                      src="/icon.svg"
                      width={32}
                      height={32}
                      alt="Smiling bridge"
                    />
                    <h1 className="text-3xl font-semibold lg:text-4xl px-2">
                      Snowbridge
                    </h1>
                  </div>
                  <Menu />
                </div>
                <div className="flex-col py-2 gap-2">
                  <div className="flex justify-center">
                    <BridgeStatus />
                  </div>
                </div>
              </div>
              <div className="w-full max-w-5xl flex place-content-center">
                <ContextComponent>{children}</ContextComponent>
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
