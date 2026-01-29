import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { HeroSection } from "@/components/home/HeroSection";
import { TrustSection } from "@/components/home/TrustSection";
import { HighlightSection } from "@/components/home/HighlightSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";

export default function Home() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <div className="flex flex-col items-center justify-center w-full">
          <HeroSection />

          <HighlightSection />

          <TrustSection />

          <FeaturesSection />
        </div>
      </ContextComponent>
    </MaintenanceBanner>
  );
}
