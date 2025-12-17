"use client";

import { Menubar } from "@/components/ui/menubar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Pencil, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ImageWithFallback } from "./ui/image-with-fallback";
import { FC, useContext, useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
  walletAtom,
  walletSheetOpenAtom,
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
  const [polkadotWalletModalOpen, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);
  const [walletSheetOpen, setWalletSheetOpen] = useAtom(walletSheetOpenAtom);

  // Disable pointer events on sheet overlay when Polkadot modal is open
  useEffect(() => {
    if (polkadotWalletModalOpen) {
      document.body.classList.add("polkadot-modal-open");
    } else {
      document.body.classList.remove("polkadot-modal-open");
    }
    return () => {
      document.body.classList.remove("polkadot-modal-open");
    };
  }, [polkadotWalletModalOpen]);

  const { walletInfo } = useWalletInfo();
  const [ethIconError, setEthIconError] = useState(false);
  const [polkadotIconError, setPolkadotIconError] = useState(false);

  const isEthConnected = !!walletInfo?.name;
  const isPolkadotConnected = polkadotAccounts && polkadotAccounts.length > 0;

  const getEthWalletIcon = () => {
    if (walletInfo?.icon) return walletInfo.icon;
    return "/images/ethereum.png";
  };

  const getPolkadotWalletIcon = () => {
    if (wallet?.logo?.src) return wallet.logo.src;
    return "/images/polkadot.png";
  };

  const WalletIcons = () => {
    if (!isEthConnected && !isPolkadotConnected) {
      return (
        <span className="glimmer-text px-3 py-1 rounded-full border border-white/60">
          Connect
        </span>
      );
    }

    return (
      <div className="flex items-center px-1 py-1 rounded-full border border-white/60 cursor-pointer">
        {isEthConnected && (
          <div className="w-7 h-7 rounded-full border-2 border-white bg-white/70 flex items-center justify-center">
            <Image
              src={ethIconError ? "/images/ethereum.png" : getEthWalletIcon()}
              width={18}
              height={18}
              alt="Ethereum wallet"
              onError={() => setEthIconError(true)}
            />
          </div>
        )}
        {isPolkadotConnected && (
          <div
            className={`w-7 h-7 rounded-full border-2 border-white bg-white/70 flex items-center justify-center ${isEthConnected ? "-ml-2" : ""}`}
          >
            <Image
              src={
                polkadotIconError
                  ? "/images/polkadot.png"
                  : getPolkadotWalletIcon()
              }
              width={18}
              height={18}
              alt="Polkadot wallet"
              onError={() => setPolkadotIconError(true)}
            />
          </div>
        )}
      </div>
    );
  };

  const PolkadotWallet = () => {
    if (!polkadotAccounts || polkadotAccounts.length == 0) {
      return (
        <div className="flex items-center justify-between py-2 mt-2">
          <h1>Polkadot</h1>
          <button
            onClick={() => setPolkadotWalletModalOpen(true)}
            className="glass-button glass-button-small flex items-center ml-2"
          >
            <Image
              src="/images/polkadot.png"
              width={16}
              height={16}
              alt="Polkadot"
            />
            <span className={"ml-1"}>Connect</span>
          </button>
        </div>
      );
    }
    return (
      <>
        <div className="flex items-center justify-between py-2 mt-2">
          <h1>Polkadot</h1>
          <div className="flex items-center gap-2">
            {wallet?.logo?.src && (
              <ImageWithFallback
                src={wallet.logo.src}
                fallbackSrc="/images/polkadot.png"
                width={20}
                height={20}
                alt={wallet?.title || "Wallet"}
                className="rounded-full"
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
              <LogOut />
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
      if (walletInfo?.icon) return walletInfo.icon;
      return "/images/ethereum.png";
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
            className="glass-button glass-button-small flex items-center ml-2"
          >
            <Image
              src="/images/ethereum.png"
              width={16}
              height={16}
              alt="Ethereum"
            />
            <span className={"ml-1"}>Connect</span>
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
              <LogOut />
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
            <p className="hidden md:flex glimmer-text">Kusama</p>
          </Link>
        ) : null}
        <Link href="/history" className="flex items-center px-3 py-1.5">
          <p className="hidden md:flex glimmer-text">History</p>
        </Link>
      </Menubar>
      <Sheet open={walletSheetOpen} onOpenChange={setWalletSheetOpen}>
        <SheetTrigger asChild>
          <button type="button" className="ml-2 mt-2">
            <WalletIcons />
          </button>
        </SheetTrigger>
        <SheetContent className="wallet-panel glass p-6 text-primary overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle
              className="text-center font-semibold text-lg"
              style={{ color: "#212d41" }}
            >
              Wallets
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <EthereumWallet />
            <PolkadotWallet />
          </div>
        </SheetContent>
      </Sheet>
      <PolkadotWalletDialog />
    </div>
  );
};
