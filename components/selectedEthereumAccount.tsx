import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";
import { cn } from "@/lib/cn";
import { trimAccount } from "@/utils/formatting";
import { ethereumAccountAtom } from "@/store/ethereum";
import { useAtomValue } from "jotai";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { BusyDialog } from "./BusyDialog";
import { ErrorDialog } from "./ErrorDialog";
import { FC, useState } from "react";
import { track } from "@vercel/analytics/react";

type SelectedEthereumWalletProps = {
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
  const { shouldSwitchNetwork, switchNetwork } = useSwitchEthereumNetwork();
  const [errorMessage, setErrorMessage] = useState(ethereumError);

  if (errorMessage) {
    console.error(errorMessage);
    setErrorMessage(
      "There was an error trying to access your wallet. Are you signed in?",
    );
  }

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
  if (shouldSwitchNetwork) {
    return (
      <>
        <Button
          className="w-full"
          type="button"
          variant="destructive"
          onClick={(e) => {
            e.preventDefault();
            switchNetwork();
            track("Switch Network");
          }}
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
        open={!ethereumLoading && errorMessage !== null}
        title="Ethereum Wallet Error"
        description={errorMessage || "Unknown Error."}
      />
    </>
  );
};
