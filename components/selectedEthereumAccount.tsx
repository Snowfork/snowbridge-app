import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";
import { cn, trimAccount } from "@/lib/utils";
import { ethereumAccountAtom, ethereumChainIdAtom } from "@/store/ethereum";
import {
  snowbridgeContextEthChainIdAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { BusyDialog } from "./busyDialog";
import { ErrorDialog } from "./errorDialog";
import { FC } from "react";

export type SelectedEthereumWalletProps = {
  className?: string;
  walletChars?: number;
};
export const SelectedEthereumWallet: FC<SelectedEthereumWalletProps> = ({
  className,
  walletChars,
}) => {
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const [connectToEthereumWallet, ethereumLoading, ethereumError] =
    useConnectEthereumWallet();
  const ethereumChainId = useAtomValue(ethereumChainIdAtom);
  const contextEthereumChainId = useAtomValue(snowbridgeContextEthChainIdAtom)!;
  const snowbridgeEnv = useAtomValue(snowbridgeEnvironmentAtom);
  const switchEthereumNetwork = useSwitchEthereumNetwork(
    snowbridgeEnv.ethChainId,
  );

  if (!ethereumAccount) {
    return (
      <Button
        className="w-full"
        type="button"
        variant="link"
        onClick={connectToEthereumWallet}
      >
        Connect Ethereum
      </Button>
    );
  }
  if (
    (contextEthereumChainId !== null &&
      ethereumChainId !== contextEthereumChainId) ||
    snowbridgeEnv.ethChainId !== ethereumChainId
  ) {
    return (
      <>
        <Button
          className="w-full"
          type="button"
          variant="destructive"
          onClick={switchEthereumNetwork}
        >
          Switch Network
        </Button>
      </>
    );
  }
  return (
    <>
      <div
        className={cn(
          "hover:underline hover:cursor-pointer overflow-clip text-ellipsis",
          className,
        )}
        onClick={() => {
          toast.info("Select account in wallet.", {
            position: "bottom-center",
            closeButton: true,
            dismissible: true,
            id: "wallet_select",
          });
        }}
      >
        <pre className="inline md:hidden">
          {trimAccount(ethereumAccount, walletChars ?? 26)}
        </pre>
        <pre className="w-auto hidden md:inline">{ethereumAccount}</pre>
      </div>
      <BusyDialog
        open={ethereumLoading}
        title="Ethereum Wallet"
        description="Waiting for Ethereum wallet..."
      />
      <ErrorDialog
        open={!ethereumLoading && ethereumError !== null}
        title="Ethereum Wallet Error"
        description={ethereumError || "Unknown Error."}
      />
    </>
  );
};
