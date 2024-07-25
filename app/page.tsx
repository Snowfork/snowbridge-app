import { ContextComponent } from "@/components/contextComponent";
import { TransferComponent } from "@/components/transfer";

export default function Home() {
  return (
    <ContextComponent>
      <TransferComponent />
    </ContextComponent>
  );
}
