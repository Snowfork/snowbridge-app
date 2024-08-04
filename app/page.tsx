import { ContextComponent } from "@/components/contextComponent";
import { TransferComponent } from "@/components/transfer";
import { polkadotWalletAggregator } from "@/lib/client/polkadot-onboard";
import {
  PolkadotWalletsContextProvider,
  useWallets,
} from "@polkadot-onboard/react";

export default function Home() {
  return (
    <ContextComponent>
      <TransferComponent />
    </ContextComponent>
  );
}
