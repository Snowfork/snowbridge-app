"use client";

import { getEnvEthereumNetwork, useWeb3Modal } from "@/lib/client/web3modal";
import { cn } from "@/lib/utils";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { trimAccount } from "@/utils/formatting";
import { useSwitchNetwork } from "@reown/appkit-ethers/react";
import { track } from "@vercel/analytics/react";
import { BrowserProvider, Eip1193Provider } from "ethers";
import { useAtomValue } from "jotai";
import { FC, useEffect, useState } from "react";
import { ErrorDialog } from "./ErrorDialog";
import { Button } from "./ui/button";
import { useAppkitAccount, useAppKit } from "@reown/appkit-ethers/react";
import { useAppKitProvider } from "@reown/appkit/library/react";

export type SelectedEthereumWalletProps = {
  className?: string;
  walletChars?: number;
};
export const SelectedEthereumWallet: FC<SelectedEthereumWalletProps> = ({
  className,
  walletChars,
}) => {
  const modal = useWeb3Modal();

  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");
  const { address, isConnected, status } = useAppkitAccount();
  const { switchNetwork } = useSwitchNetwork();
  if (walletProvider) {
    const browserProvider = new BrowserProvider(walletProvider);
  }

  const { open } = useAppKit();

  //const addressParts = caipAddress.split(":");
  //const realAddress =
  //  (address ?? addressParts.length == 1)
  //    ? addressParts[0]
  //    : addressParts.length == 3
  //      ? addressParts[2]
  //      : address;
  //console.log(
  //  "abc",
  //  realAddress,
  //  caipAddress,
  //  isConnected,
  //  status,
  //  walletProvider,
  //);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (modal.getError()) {
    console.error(modal.getError());
    setErrorMessage(
      "There was an error trying to access your wallet. Are you signed in?",
    );
  }
  const caipNetwork = getEnvEthereumNetwork();

  // useEffect(() => {
  //   if (
  //     isConnected &&
  //     (caipAddress === undefined ||
  //       !caipAddress.startsWith(caipNetwork?.id ?? ""))
  //   ) {
  //     console.log("here");
  //     void modal.switchNetwork(caipNetwork);
  //   }
  // }, [modal, isConnected, caipNetwork, caipAddress]);

  if (!isConnected || address === undefined || status === "disconnected") {
    return (
      <>
        <Button
          className="w-full"
          type="button"
          variant="link"
          onClick={async (e) => {
            await open();
          }}
        >
          Connect Ethereum
        </Button>
      </>
    );
  }
  //if (
  //  caipAddress === undefined ||
  //  !caipAddress.startsWith(caipNetwork?.id ?? "")
  //) {
  //  return (
  //    <>
  //      <Button
  //        className="w-full"
  //        type="button"
  //        variant="destructive"
  //        onClick={async (e) => {
  //          //await modal.switchNetwork(caipNetwork);
  //          await switchNetwork(caipNetwork);
  //          //if (walletProvider) {
  //          //  const chainIdHex = `0x${caipNetwork.chainId.toString(16)}`;
  //          //  walletProvider.request({
  //          //    method: "wallet_switchEthereumChain",
  //          //    params: [{ chainId: chainIdHex }],
  //          //  });
  //          //}
  //          track("Switch Network");
  //        }}
  //      >
  //        Switch Network
  //      </Button>
  //    </>
  //  );
  //}
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
      <ErrorDialog
        open={errorMessage !== null}
        title="Ethereum Wallet Error"
        description={errorMessage || "Unknown Error."}
      />
    </>
  );
};
