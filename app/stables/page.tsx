import { ContextComponent } from "@/components/Context";
import { StablesTransferForm } from "@/components/stables/StablesTransferForm";

export default function StablesPage() {
  return (
    <ContextComponent>
      <StablesTransferForm />
    </ContextComponent>
  );
}
