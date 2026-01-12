import { TransferComponent } from "@/components/transfer/TransferComponent";
import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

export default function Home() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <div className="flex justify-center w-full">
          <TransferComponent />
        </div>
      </ContextComponent>
    </MaintenanceBanner>
  );
}
