import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MainenanceBanner";
import { WrapComponent } from "@/components/Wrap";

export default function Wrap() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <WrapComponent />
      </ContextComponent>
    </MaintenanceBanner>
  );
}