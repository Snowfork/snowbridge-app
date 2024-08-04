"use client";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { BusyDialog } from "./BusyDialog";
import { ErrorDialog } from "./ErrorDialog";
import { FC, useState } from "react";
import { track } from "@vercel/analytics/react";

import {} from "@/lib/client/web3modal";
import {
  useDisconnect,
  useSwitchNetwork,
  useWalletInfo,
  useWeb3Modal,
  useWeb3ModalAccount,
  useWeb3ModalError,
  useWeb3ModalTheme,
} from "@web3modal/ethers/react";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import { trimAccount } from "@/utils/formatting";

export type SelectedEthereumWalletProps = {
  className?: string;
  walletChars?: number;
};
export const SelectedEthereumWallet: FC<SelectedEthereumWalletProps> = ({
  className,
  walletChars,
}) => {
  const { themeMode, setThemeMode } = useWeb3ModalTheme();
  const { error } = useWeb3ModalError();
  const { switchNetwork } = useSwitchNetwork();
  const { address, chainId, isConnected, status } = useWeb3ModalAccount();
  const { disconnect } = useDisconnect();
  const { open, close } = useWeb3Modal();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const env = useAtomValue(snowbridgeEnvironmentAtom);

  if (themeMode !== "light") {
    setThemeMode("light");
  }

  if (error) {
    console.error(error);
    setErrorMessage(
      "There was an error trying to access your wallet. Are you signed in?",
    );
  }

  if (!isConnected || address === undefined || status === "disconnected") {
    disconnect();
    close();
    return (
      <Button
        className="w-full"
        type="button"
        variant="link"
        onClick={async (e) => {
          e.preventDefault();
          await open();
        }}
      >
        Connect Ethereum
      </Button>
    );
  }
  if (chainId !== env.ethChainId) {
    return (
      <>
        <Button
          className="w-full"
          type="button"
          variant="destructive"
          onClick={(e) => {
            e.preventDefault();
            switchNetwork(env.ethChainId);
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
          {trimAccount(address, walletChars ?? 26)}
        </pre>
        <pre className="w-auto hidden md:inline">{address}</pre>
      </div>
      <BusyDialog
        open={false}
        title="Ethereum Wallet"
        description="Waiting for Ethereum wallet..."
      />
      <ErrorDialog
        open={errorMessage !== null}
        title="Ethereum Wallet Error"
        description={errorMessage || "Unknown Error."}
      />
    </>
  );
};
