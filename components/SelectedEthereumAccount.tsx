"use client";

import { cn } from "@/lib/utils";
import { trimAccount } from "@/utils/formatting";
import { track } from "@vercel/analytics/react";
import { FC } from "react";
import { ErrorDialog } from "./ErrorDialog";
import { Button } from "./ui/button";
import { useSwitchNetwork, useWeb3Modal } from "@web3modal/ethers/react";
import { getEnvironment } from "@/lib/snowbridge";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { windowEthereumErrorAtom } from "@/store/ethereum";
import { useAtom } from "jotai";

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
  const [windowEthereumError, setWindowEthereumError] = useAtom(
    windowEthereumErrorAtom,
  );

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
        <ErrorDialog
          open={windowEthereumError !== null}
          dismiss={() => {
            console.log(windowEthereumError);
            setWindowEthereumError(null);
          }}
          title="Ethereum Wallet Error"
          description={(windowEthereumError ?? "Unknown Error").toString()}
        />
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
          onClick={async (_) => {
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
    </>
  );
};
