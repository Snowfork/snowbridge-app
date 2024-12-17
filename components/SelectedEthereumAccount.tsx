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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectIcon } from "@/components/SelectIcon";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";

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

  if (account !== null && chainId !== null && chainId === env.ethChainId) {
    return (
      <Select value={account}>
        <SelectTrigger>
          <SelectValue placeholder="Select an account" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {[account]?.map((acc) => {
              return (
                <SelectItem key={account} value={account}>
                  <SelectItemWithIcon
                    label={account}
                    link={`/images/ethereum.png`}
                  />
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }
};
