import { Analytics } from "@vercel/analytics/react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TermsOfUse } from "@/components/TermsOfUse";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import "@/styles/overrides.css";
import { Providers } from "./providers";
import { bridgeInfoFor } from "@snowbridge/registry";
import { BackgroundSnowfall } from "@/components/BackgroundSnowfall";
import { getEnvironmentName } from "@/lib/snowbridge";

export const maxDuration = 90;
export const revalidate = 43_200; // 12 hours: 60 * 60 * 12

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const info = bridgeInfoFor(getEnvironmentName());

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <title>Snowbridge</title>
      </head>
      <body>
        <BackgroundSnowfall />
        <Providers info={info}>
          <main className="flex min-h-screen flex-col relative z-10">
            <Header />
            <div className="flex-1 w-full py-12 px-4 sm:px-6 py-1 pb-8 items-center justify-center box-border overflow-visible">
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
