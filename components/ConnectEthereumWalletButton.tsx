import { useAppKit, useAppKitNetwork } from "@reown/appkit/react";
import { Button } from "./ui/button";
import { useAtom } from "jotai";
import { ErrorDialog } from "./ErrorDialog";
import { windowEthereumErrorAtom } from "@/store/ethereum";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { track } from "@vercel/analytics";
import { getEnvironment } from "@/lib/snowbridge";
import { cn } from "@/lib/utils";
import { getEnvEthereumNetwork } from "@/lib/client/web3modal";

interface ConnectEthereumWalletButtonProps {
  className?: string;
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
}: ConnectEthereumWalletButtonProps) {
  const { open } = useAppKit();
  const env = getEnvironment();

  const [windowEthereumError, setWindowEthereumError] = useAtom(
    windowEthereumErrorAtom,
  );
  const { switchNetwork } = useAppKitNetwork();

  const { account, chainId } = useConnectEthereumWallet();
  if (account !== null && (chainId === null || chainId !== env.ethChainId)) {
    return (
      <>
        <Button
          className={cn("w-full", className)}
          type="button"
          variant="default"
          onClick={async (_) => {
            switchNetwork(getEnvEthereumNetwork());
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
        className="w-1/3 action-button"
        type="button"
        variant={variant ?? "link"}
        onClick={async (e) => {
          await open({ view: "Connect" });
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
