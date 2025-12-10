"use client";

import { FC, useEffect } from "react";
import { getEnvironment } from "@/lib/snowbridge";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { useAppKit, useWalletInfo } from "@reown/appkit/react";
import Image from "next/image";

export type SelectedEthereumWalletProps = {
  field?: any;
};
export const SelectedEthereumWallet: FC<SelectedEthereumWalletProps> = ({
  field,
}) => {
  const env = getEnvironment();
  const { account, chainId } = useConnectEthereumWallet();
  const { open } = useAppKit();
  const { walletInfo } = useWalletInfo();

  useEffect(() => {
    // If field is set, set the field value to the selected address
    if (field && account) {
      field.onChange(account);
    }
  }, [account]);

  if (account !== null && chainId !== null) {
    return (
      <div
        onClick={async () => await open({ view: "Account" })}
        className="flex h-auto w-full gap-2 items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 fake-dropdown cursor-pointer hover:bg-white/5 transition-colors"
      >
        <Image
          className="selectIcon"
          src={`/images/ethereum.png`}
          width={20}
          height={20}
          alt="ethereum"
        />
        <div className="flex flex-col flex-1 min-w-0">
          <div className="truncate">{account}</div>
          {walletInfo?.name && (
            <div className="text-xs text-muted-foreground">
              {walletInfo.name}
            </div>
          )}
        </div>
      </div>
    );
  }
};
