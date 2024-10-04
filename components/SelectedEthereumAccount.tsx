"use client";

import { cn } from "@/lib/utils";
import { trimAccount } from "@/utils/formatting";
import { track } from "@vercel/analytics/react";
import { FC, useState } from "react";
import { ErrorDialog } from "./ErrorDialog";
import { Button } from "./ui/button";
import {
  useSwitchNetwork,
  useWeb3Modal,
  useWeb3ModalError,
} from "@web3modal/ethers/react";
import { getEnvironment } from "@/lib/snowbridge";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";

export type SelectedEthereumWalletProps = {
  className?: string;
  walletChars?: number;
};
export const SelectedEthereumWallet: FC<SelectedEthereumWalletProps> = ({
  className,
  walletChars,
}) => {
  const env = getEnvironment();
  const { account, chainId } = useConnectEthereumWallet();
  const { switchNetwork } = useSwitchNetwork();
  const { open } = useWeb3Modal();
  const { error } = useWeb3ModalError();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (error) {
    console.error(error);
    setErrorMessage(
      "There was an error trying to access your wallet. Are you signed in?",
    );
  }

  if (account === null) {
    return (
      <>
        <Button
          className="w-full"
          type="button"
          variant="link"
          onClick={async (e) => {
            await open({ view: "Connect" });
          }}
        >
          Connect Ethereum
        </Button>
      </>
    );
  }
  if (chainId === null || chainId !== env.ethChainId) {
    return (
      <>
        <Button
          className="w-full"
          type="button"
          variant="destructive"
          onClick={async (e) => {
            await switchNetwork(env.ethChainId);
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
        onClick={async () => await open({ view: "Account" })}
      >
        <pre className="inline md:hidden">
          {trimAccount(account, walletChars ?? 26)}
        </pre>
        <pre className="w-auto hidden md:inline">{account}</pre>
      </div>
      <ErrorDialog
        open={errorMessage !== null}
        title="Ethereum Wallet Error"
        description={errorMessage || "Unknown Error."}
      />
    </>
  );
};
