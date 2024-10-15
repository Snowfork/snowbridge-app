import { TransferComponent } from "@/components/Transfer";
import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MainenanceBanner";

export default function Home() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <TransferForm1 />
      </ContextComponent>
    </MaintenanceBanner>
  );
}
