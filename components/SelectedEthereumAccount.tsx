"use client";

import { FC, useEffect } from "react";
import { getEnvironment } from "@/lib/snowbridge";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import { useSwitchNetwork, useWeb3Modal } from "@web3modal/ethers/react";
import Image from "next/image";

export type SelectedEthereumWalletProps = {
  field
};
export const SelectedEthereumWallet: FC<SelectedEthereumWalletProps> = ({
                                                                          field
}) => {
  const env = getEnvironment();
  const { account, chainId } = useConnectEthereumWallet();
  const { open } = useWeb3Modal();

  useEffect(() => {
    // If field is set, set the field value to the selected address
    if (field && account) {
      field.onChange(account);
    }
  }, [account]);

  if (account !== null && chainId !== null && chainId === env.ethChainId) {
    return (
      <div onClick={async () => await open({ view: "Account" })} className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 fake-dropdown">
        <Image
          className="selectIcon"
          src={`/images/ethereum.png`}
          width={20}
          height={20}
          alt="ethereum"/>
        {account}
      </div>
    );
  }
};
