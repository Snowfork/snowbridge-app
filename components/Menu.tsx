"use client";

import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
  MenubarSeparator,
} from "@/components/ui/menubar";
import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Pencil, Unplug } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { FC, useContext, useState } from "react";
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
import { useAppKit, useWalletInfo } from "@reown/appkit/react";
import { disconnectWallet } from "@/lib/client/web3modal";
import { RegistryContext } from "@/app/providers";

export const Menu: FC = () => {
  const envName = useAtomValue(snowbridgeEnvNameAtom);

  useEthereumProvider();
  const registry = useContext(RegistryContext)!;
  useConnectPolkadotWallet(registry.relaychain.ss58Format ?? 42);

  const wallet = useAtomValue(walletAtom);
  const setWallet = useSetAtom(walletAtom);

  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const setPolkadotAccounts = useSetAtom(polkadotAccountsAtom);
  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);

  const PolkadotWallet = () => {
    const [showPolkadotIcon, setShowPolkadotIcon] = useState(true);

    if (!polkadotAccounts || polkadotAccounts.length == 0) {
      return (
        <div className="flex items-center justify-between py-2 mt-2">
          <h1>Polkadot</h1>
          <button
            onClick={() => setPolkadotWalletModalOpen(true)}
            className="text-gray-500 hover:text-gray-700 transition-colors font-medium"
          >
            Connect
          </button>
        </div>
      );
    }
    return (
      <>
        <div className="flex items-center justify-between py-2 mt-2">
          <h1>Polkadot</h1>
          <div className="flex items-center gap-2">
            {showPolkadotIcon && (
              <Image
                src={`/images/wallets/${wallet?.title?.toLowerCase().replace(/[^a-z0-9]/g, "")}.png`}
                width={20}
                height={20}
                alt={wallet?.title || "Wallet"}
                className="rounded-full"
                onError={() => setShowPolkadotIcon(false)}
              />
            )}
            <span>{wallet?.title}</span>
            <button
              onClick={() => setPolkadotWalletModalOpen(true)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Pencil />
            </button>
            <button
              onClick={() => {
                setPolkadotAccount(null);
                setPolkadotAccounts([]);
                setWallet(null);
              }}
              className="text-gray-500 hover:text-red-600 transition-colors"
            >
              <Unplug />
            </button>
          </div>
        </div>
        <SelectedPolkadotAccount
          source="polkadot"
          ss58Format={registry.relaychain.ss58Format}
          polkadotAccount={polkadotAccount?.address}
          polkadotAccounts={polkadotAccounts}
          onValueChange={setPolkadotAccount}
          walletName={wallet?.title}
        />
      </>
    );
  };

  const EthereumWallet = () => {
    const { walletInfo } = useWalletInfo();
    const { open } = useAppKit();
    const [showEthereumIcon, setShowEthereumIcon] = useState(true);

    const getWalletIcon = () => {
      if (!walletInfo?.name) return "/images/ethereum.png";
      const walletName = walletInfo.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      return `/images/wallets/${walletName}.png`;
    };

    const handleDisconnect = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await disconnectWallet();
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
    };

    if (!walletInfo?.name) {
      return (
        <div className="flex items-center justify-between py-2">
          <h1>Ethereum</h1>
          <button
            onClick={async () => await open({ view: "Connect" })}
            className="text-gray-500 hover:text-gray-700 transition-colors font-medium"
          >
            Connect
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between py-2">
          <h1>Ethereum</h1>
          <div className="flex items-center gap-2">
            {showEthereumIcon && (
              <Image
                src={getWalletIcon()}
                width={20}
                height={20}
                alt={walletInfo?.name || "Wallet"}
                className="rounded-full"
                onError={() => setShowEthereumIcon(false)}
              />
            )}
            <span>{walletInfo?.name}</span>
            <button
              onClick={async () => await open({ view: "Connect" })}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Pencil />
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-gray-500 hover:text-red-600 transition-colors"
            >
              <Unplug />
            </button>
          </div>
        </div>
        <SelectedEthereumWallet />
      </>
    );
  };

  return (
    <div className="flex items-center">
      <Menubar>
        <Link href="/" className="flex items-center px-3 py-1.5">
          <p className="hidden md:flex glimmer-text">Transfer</p>
        </Link>
        {envName === "westend_sepolia" ? null : (
          <Link href="/switch" className="flex items-center px-3 py-1.5">
            <p className="hidden md:flex glimmer-text">Polar Path</p>
          </Link>
        )}
        {envName === "polkadot_mainnet" ? (
          <Link href="/kusama" className="flex items-center px-3 py-1.5">
            <p className="hidden md:flex glimmer-text">To Kusama</p>
          </Link>
        ) : null}
        <Link href="/history" className="flex items-center px-3 py-1.5">
          <p className="hidden md:flex glimmer-text">History</p>
        </Link>
        <MenubarMenu>
          <MenubarTrigger>
            <p className="hidden md:flex glimmer-text">Wallets</p>
          </MenubarTrigger>
          <MenubarContent
            align="center"
            className="glass walletModal shadow-sm p-5 text-primary"
          >
            <h2
              className="text-center font-semibold text-lg mb-4"
              style={{ color: "#212d41" }}
            >
              Wallets
            </h2>
            <EthereumWallet />
            <PolkadotWallet />
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <PolkadotWalletDialog />
    </div>
  );
};
