import { ContextComponent } from "@/components/Context";
import { HaltBridgeForm } from "@/components/governance/HaltBridgeForm";

export default function GovernancePage() {
  return (
    <ContextComponent>
      <HaltBridgeForm />
    </ContextComponent>
  );
}
