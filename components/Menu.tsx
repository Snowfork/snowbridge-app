"use client";

import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
  MenubarSeparator,
} from "@/components/ui/menubar";
import { cn } from "@/lib/utils";
import {
  relayChainNativeAssetAtom,
  snowbridgeEnvNameAtom,
} from "@/store/snowbridge";
import { useAtom, useAtomValue } from "jotai";
import {
  Github,
  LucideArrowRightLeft,
  LucideBarChart,
  LucideBookText,
  LucideBug,
  LucideHistory,
  LucideMenu,
  LucideSend,
  LucideWallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FC } from "react";
import { Button } from "./ui/button";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
  walletAtom,
} from "@/store/polkadot";
import { SelectedEthereumWallet } from "./SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { trimAccount } from "@/utils/formatting";
import { PolkadotWalletDialog } from "./PolkadotWalletDialog";
import { useConnectPolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import { useAssetMetadata } from "@/hooks/useAssetMetadata";
import { useEthereumProvider } from "@/hooks/useEthereumProvider";
import { windowEthereumTypeAtom } from "@/store/ethereum";
import { useWeb3Modal } from "@web3modal/ethers/react";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";

export const Menu: FC = () => {
  const envName = useAtomValue(snowbridgeEnvNameAtom);

  useEthereumProvider();
  useAssetMetadata();
  const relayChainNativeAsset = useAtomValue(relayChainNativeAssetAtom);
  useConnectPolkadotWallet(relayChainNativeAsset?.ss58Format ?? 42);

  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const wallet = useAtomValue(walletAtom);

  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);

  const PolkadotWallet = () => {
    if (!polkadotAccounts || polkadotAccounts.length == 0) {
      return (
        <Button
          className="w-full"
          variant="link"
          onClick={() => setPolkadotWalletModalOpen(true)}
        >
          Connect Polkadot
        </Button>
      );
    }
    return (
      <>
        <h1 className="font-semibold py-2">Polkadot</h1>
        <div className="text-xs">
          <p>Name: {(polkadotAccount ?? polkadotAccounts[0]).name}</p>
          <p className="inline">Address: </p>
          <pre className="inline">
            {trimAccount((polkadotAccount ?? polkadotAccounts[0]).address, 28)}
          </pre>
          <p>
            Wallet:{" "}
            <Button
              className="w-full"
              variant="link"
              onClick={() => setPolkadotWalletModalOpen(true)}
            >
              {wallet?.title}
            </Button>{" "}
          </p>
          <p>Account:</p>
        </div>
        <SelectedPolkadotAccount source="polkadot"/>
      </>
    );
  };

  const EthereumWallet = () => {
    const { account } = useConnectEthereumWallet();
    const walletType = useAtomValue(windowEthereumTypeAtom);
    const { open } = useWeb3Modal();
    return (
      <>
        <div>
          <h1 className="font-semibold py-2">Ethereum</h1>
          <p className="text-xs">
            Wallet:{" "}
            <Button
              className="w-full"
              variant="link"
              onClick={async () => await open({ view: "Connect" })}
            >
              {walletType ?? "Select Ethereum"}
            </Button>{" "}
          </p>
          <p className="text-xs">Account:</p>
        </div>
        <SelectedEthereumWallet />
      </>
    );
  };

  return (
    <div className="flex items-center">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/" className="flex items-center">
              <LucideSend />
              <p className="pl-2 hidden md:flex">Transfer</p>
            </Link>
          </MenubarTrigger>
        </MenubarMenu>
        {envName === "westend_sepolia" ? null : (
          <MenubarMenu>
            <MenubarTrigger>
              <Link href="/switch" className="flex items-center">
                <LucideArrowRightLeft />
                <p className="pl-2 hidden md:flex">Polar Path</p>
              </Link>
            </MenubarTrigger>
          </MenubarMenu>
        )}
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/status" className="flex items-center">
              <LucideBarChart />
              <p className="pl-2 hidden md:flex">Status</p>
            </Link>
          </MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/history" className="flex items-center">
              <LucideHistory />
              <p className="pl-2 hidden md:flex">History</p>
            </Link>
          </MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>
            <LucideWallet />
            <p className="pl-2 hidden md:flex">Wallets</p>
          </MenubarTrigger>
          <MenubarContent align="center" className="walletModal shadow-sm p-5">
            <div className="w-90">
              <EthereumWallet />
              <MenubarSeparator></MenubarSeparator>
              <PolkadotWallet />
            </div>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <PolkadotWalletDialog />
    </div>
  );
};
