import { TransferComponent } from "@/components/Transfer";
import { ContextComponent } from "@/components/Context";

export default function Home() {
  return (
    <ContextComponent>
      <TransferComponent />
    </ContextComponent>
  );
}
