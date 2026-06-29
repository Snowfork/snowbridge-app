// Ported from app/layout.tsx (Next root layout) to a React Router layout
// route. The <html>/<head>/<body> shell now lives in index.html; this renders
// the in-body chrome and an <Outlet /> for the matched child route.
import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TermsOfUse } from "@/components/TermsOfUse";
import { Toaster } from "@/components/ui/sonner";
import { BackgroundSnowfall } from "@/components/BackgroundSnowfall";
import { Providers } from "@/app/providers";
import { getEnvironmentName } from "@/lib/snowbridgeEnv";
import { bridgeInfoWithKusamaRoutes } from "@/lib/bridgeInfo";

export function RootLayout() {
  const info = bridgeInfoWithKusamaRoutes(getEnvironmentName());

  return (
    <Providers info={info}>
      <BackgroundSnowfall />
      <main className="flex min-h-screen flex-col relative z-10">
        <Header />
        <div className="flex-1 w-full py-12 px-4 sm:px-6 py-1 pb-8 items-center justify-center box-border overflow-visible">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
        <footer className="w-full px-6 py-6 flex flex-col items-center text-sm">
          <Footer />
        </footer>
        <Toaster />
        <TermsOfUse />
      </main>
    </Providers>
  );
}
