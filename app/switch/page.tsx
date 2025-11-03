import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { SwitchComponent } from "@/components/Switch";

export default function Switch() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <SwitchComponent />
      </ContextComponent>
    </MaintenanceBanner>
  );
}
