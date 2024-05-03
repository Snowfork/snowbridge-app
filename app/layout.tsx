import { BridgeStatus } from "@/components/bridgeStatus";
import { Footer } from "@/components/footer";
import { Menu } from "@/components/menu";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snowbridge",
  description: "The Ethereum Polkadot bridge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className)}>
        <main className="flex min-h-screen flex-col items-center justify-between p-4 lg:p-24">
          <div className="w-full max-w-5xl gap-4 flex flex-col">
            <div className="w-full place-items-center justify-between flex flex-col md:flex-row">
              <h1 className="text-3xl font-semibold lg:text-4xl mb-4 lg:mb-0">Snowbridge</h1>
              <Menu />
            </div>
            <div className="flex justify-center">
              <BridgeStatus />
            </div>
          </div>
          <div className="w-full max-w-5xl flex place-content-center">
            {children}
          </div>
          <div className="w-full max-w-5xl flex flex-col place-items-center text-sm">
            <Footer />
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
