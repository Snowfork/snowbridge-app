"use client";

import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
  MenubarSeparator,
} from "@/components/ui/menubar";
import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { useAtom, useAtomValue } from "jotai";
import {
  LucideArrowRightLeft,
  LucideBarChart,
  LucideHistory,
  LucideSend,
  LucideWallet,
} from "lucide-react";
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
import { PolkadotWalletDialog } from "./PolkadotWalletDialog";
import { useConnectPolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import { useEthereumProvider } from "@/hooks/useEthereumProvider";
import { windowEthereumTypeAtom } from "@/store/ethereum";
import { useAppKit } from "@reown/appkit/react";
import { useAssetRegistry } from "@/hooks/useAssetRegistry";

export const Menu: FC = () => {
  const envName = useAtomValue(snowbridgeEnvNameAtom);

  useEthereumProvider();
  const { data: registry } = useAssetRegistry();
  useConnectPolkadotWallet(registry.relaychain.ss58Format ?? 42);

  const wallet = useAtomValue(walletAtom);

  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
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
        <div>
          <p className="text-xs">Wallet: </p>
          <div className="flex">
            <div className="p-2">{wallet?.title}</div>
            <Button
              variant="link"
              onClick={() => setPolkadotWalletModalOpen(true)}
            >
              (change)
            </Button>{" "}
          </div>
          <p>Account:</p>
        </div>
        <SelectedPolkadotAccount
          source="polkadot"
          ss58Format={registry.relaychain.ss58Format}
          polkadotAccount={polkadotAccount?.address}
          polkadotAccounts={polkadotAccounts}
          onValueChange={setPolkadotAccount}
        />
      </>
    );
  };

  const EthereumWallet = () => {
    const walletType = useAtomValue(windowEthereumTypeAtom);
    const { open } = useAppKit();
    return (
      <>
        <div>
          <h1 className="font-semibold py-2">Ethereum</h1>
          <p className="text-xs">Wallet: </p>{" "}
          <div className="flex">
            <div className="p-2">
              {walletType ? `WalletConnect: ${walletType}` : "Disconnected"}
            </div>
            <Button
              variant="link"
              onClick={async () => await open({ view: "Connect" })}
            >
              {walletType ? "(change)" : "(connect)"}
            </Button>{" "}
          </div>
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
