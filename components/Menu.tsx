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
              variant="outline"
              onClick={() => setPolkadotWalletModalOpen(true)}
            >
              {wallet?.title}
            </Button>{" "}
          </p>
          <p>Account:</p>
        </div>
        <SelectedPolkadotAccount />
      </>
    );
  };

  const EthereumWallet = () => {
    const { account } = useConnectEthereumWallet();
    const walletType = useAtomValue(windowEthereumTypeAtom);
    const { open } = useWeb3Modal();
    return (
      <>
        <div className={account === null ? "hidden" : ""}>
          <h1 className="font-semibold py-2">Ethereum</h1>
          <p className="text-xs">
            Wallet:{" "}
            <Button
              className="w-full"
              variant="outline"
              onClick={async () => await open({ view: "Connect" })}
            >
              {walletType ?? "Unknown"}
            </Button>{" "}
          </p>
          <p className="text-xs">Account:</p>
        </div>
        <SelectedEthereumWallet className="text-sm" walletChars={24} />
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
          <MenubarContent align="center">
            <div className="w-60">
              <EthereumWallet />
              <MenubarSeparator></MenubarSeparator>
              <PolkadotWallet />
            </div>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarContent align="center">
            <Button
              className="flex items-center justify-start w-auto h-auto gap-2"
              variant="link"
              onClick={() =>
                window.open("https://github.com/Snowfork/snowbridge")
              }
            >
              <Github className="w-[40px] h-[40px]" />
              <p>GitHub</p>
            </Button>
            <Button
              className="flex items-center justify-start w-auto h-auto gap-2"
              variant="link"
              onClick={() =>
                window.open(
                  "https://github.com/Snowfork/snowbridge-app/issues/new/choose",
                )
              }
            >
              <LucideBug className="w-[40px] h-[40px]" />
              <p>Report an issue</p>
            </Button>
            <Button
              className="flex items-center justify-start w-auto h-auto gap-2"
              variant="link"
              onClick={() => window.open("https://docs.snowbridge.network/")}
            >
              <LucideBookText className="w-[40px] h-[40px]" />
              <p>Docs</p>
            </Button>
            <Button
              className={cn(
                "flex items-center justify-start w-auto h-auto gap-2",
                envName === "polkadot_mainnet" ? "" : "hidden",
              )}
              variant="link"
              onClick={() =>
                window.open("https://dune.com/substrate/snowbridge")
              }
            >
              <Image
                src="https://dune.com/assets/DuneLogoCircle.svg"
                width={40}
                height={40}
                alt="Dune Logo"
              />
              <p>Snowbridge Dune Dashboard</p>
            </Button>
          </MenubarContent>
          <MenubarTrigger>
            <LucideMenu />
            <p className="pl-2 hidden md:flex">More</p>
          </MenubarTrigger>
        </MenubarMenu>
      </Menubar>
      <PolkadotWalletDialog />
    </div>
  );
};
