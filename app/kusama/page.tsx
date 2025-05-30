import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MainenanceBanner";
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
