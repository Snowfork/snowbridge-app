import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MainenanceBanner";
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
