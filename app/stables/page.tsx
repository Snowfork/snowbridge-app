import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { StablesTransferForm } from "@/components/stables/StablesTransferForm";

export default function StablesPage() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <div className="flex justify-center w-full">
          <StablesTransferForm />
        </div>
      </ContextComponent>
    </MaintenanceBanner>
  );
}
