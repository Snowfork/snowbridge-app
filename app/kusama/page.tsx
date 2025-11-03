import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { KusamaComponent } from "@/components/Kusama";

export default function Kusama() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <KusamaComponent />
      </ContextComponent>
    </MaintenanceBanner>
  );
}
