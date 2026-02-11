import { useAppKitNetwork } from "@reown/appkit/react";
import { Button } from "./ui/button";
import { useAtom, useSetAtom } from "jotai";
import { ErrorDialog } from "./ErrorDialog";
import { windowEthereumErrorAtom } from "@/store/ethereum";
import { walletSheetOpenAtom } from "@/store/polkadot";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { track } from "@vercel/analytics";
import { cn } from "@/lib/utils";
import { getEthereumNetwork } from "@/lib/client/web3modal";

interface ConnectEthereumWalletButtonProps {
  className?: string;
  networkId: number;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | null
    | undefined;
}
export function ConnectEthereumWalletButton({
  className,
  variant,
  networkId,
}: ConnectEthereumWalletButtonProps) {
  const setWalletSheetOpen = useSetAtom(walletSheetOpenAtom);

  const [windowEthereumError, setWindowEthereumError] = useAtom(
    windowEthereumErrorAtom,
  );
  const { switchNetwork } = useAppKitNetwork();

  const { account, chainId } = useConnectEthereumWallet();
  if (account !== null && (chainId === null || chainId !== networkId)) {
    return (
      <>
        <Button
          className={cn("w-full", className)}
          type="button"
          variant="default"
          onClick={async (_) => {
            switchNetwork(getEthereumNetwork(networkId));
            track("Switch Network");
          }}
        >
          Switch Network
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <Button
        className="w-full action-button"
        type="button"
        variant={variant ?? "link"}
        onClick={(e) => {
          e.preventDefault();
          setWalletSheetOpen(true);
        }}
      >
        Connect Wallet
      </Button>
      <ErrorDialog
        open={windowEthereumError !== null}
        dismiss={() => {
          console.error(windowEthereumError);
          setWindowEthereumError(null);
        }}
        title="Ethereum Wallet Error"
        description={(windowEthereumError ?? "Unknown Error").toString()}
      />
    </div>
  );
}
