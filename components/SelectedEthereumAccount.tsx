"use client";

import { cn } from "@/lib/utils";
import { trimAccount } from "@/utils/formatting";
import { track } from "@vercel/analytics/react";
import { FC, useEffect } from "react";
import { Button } from "./ui/button";
import { useSwitchNetwork, useWeb3Modal } from "@web3modal/ethers/react";
import { getEnvironment } from "@/lib/snowbridge";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { ConnectEthereumWalletButton } from "./ConnectEthereumWalletButton";

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
  const { open } = useWeb3Modal();

  if (account === null || chainId === null || chainId !== env.ethChainId) {
    return <ConnectEthereumWalletButton />;
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
