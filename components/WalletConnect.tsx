"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Pencil, LogOut } from "lucide-react";
import Image from "next/image";
import { ImageWithFallback } from "./ui/image-with-fallback";
import { trimAccount } from "@/utils/formatting";
import { FC, useContext, useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
  walletAtom,
  walletSheetOpenAtom,
} from "@/store/polkadot";
import { ethereumAccountAtom } from "@/store/ethereum";
import { SelectedEthereumWallet } from "./SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { PolkadotWalletDialog } from "./PolkadotWalletDialog";
import { useConnectPolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import { useEthereumProvider } from "@/hooks/useEthereumProvider";
import { useAppKit, useWalletInfo } from "@reown/appkit/react";
import { disconnectWallet } from "@/lib/client/web3modal";
import { RegistryContext } from "@/app/providers";
import { EthereumTokenList, PolkadotTokenList } from "./WalletTokenList";

export const WalletConnect: FC = () => {
  useEthereumProvider();
  const registry = useContext(RegistryContext)!;
  useConnectPolkadotWallet(registry.relaychain.ss58Format ?? 42);

  const wallet = useAtomValue(walletAtom);
  const setWallet = useSetAtom(walletAtom);

  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const setPolkadotAccounts = useSetAtom(polkadotAccountsAtom);
  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const [polkadotWalletModalOpen, setPolkadotWalletModalOpen] = useAtom(
    polkadotWalletModalOpenAtom,
  );
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

  // Auto-select first Polkadot account if none is selected
  useEffect(() => {
    if (polkadotAccounts && polkadotAccounts.length > 0 && !polkadotAccount) {
      setPolkadotAccount(polkadotAccounts[0].address);
    }
  }, [polkadotAccounts, polkadotAccount, setPolkadotAccount]);

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
        <Button className="w-full action-button" type="button">
          Connect
        </Button>
      );
    }

    return (
      <div className="flex items-center px-1 py-1 rounded-full border border-gray-600 cursor-pointer">
        {isEthConnected && (
          <div className="w-7 h-7 rounded-full border-2 border-gray-400 bg-white/70 flex items-center justify-center">
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
            className={`w-7 h-7 rounded-full border-2 border-gray-400 bg-white/70 flex items-center justify-center ${
              isEthConnected ? "-ml-2" : ""
            }`}
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

  const PolkadotWalletHeader = () => {
    if (!polkadotAccounts || polkadotAccounts.length == 0) {
      return (
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-2">
            <Image
              src="/images/polkadot.png"
              width={20}
              height={20}
              alt="Polkadot"
              className="rounded-full"
            />
            <span className="font-medium">Polkadot</span>
          </div>
          <div
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setPolkadotWalletModalOpen(true);
            }}
            className="glass-button glass-button-small flex items-center cursor-pointer"
          >
            <span>Connect</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between w-full pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <ImageWithFallback
            src={wallet?.logo?.src || "/images/polkadot.png"}
            fallbackSrc="/images/polkadot.png"
            width={20}
            height={20}
            alt={wallet?.title || "Wallet"}
            className="rounded-full flex-shrink-0"
          />
          <span className="font-medium">Polkadot</span>
          {polkadotAccount?.address && (
            <span className="text-xs text-muted-foreground truncate mt-2px">
              {trimAccount(polkadotAccount.address, 10)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setPolkadotWalletModalOpen(true);
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </div>
          <div
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setPolkadotAccount(null);
              setPolkadotAccounts([]);
              setWallet(null);
            }}
            className="text-gray-500 hover:text-red-600 transition-colors p-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  };

  const PolkadotWalletContent = () => {
    if (!polkadotAccounts || polkadotAccounts.length == 0) {
      return (
        <div className="text-sm text-muted-foreground text-center py-2">
          Connect your Polkadot wallet to view accounts
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <SelectedPolkadotAccount
          source="polkadot"
          ss58Format={registry.relaychain.ss58Format}
          polkadotAccount={polkadotAccount?.address}
          polkadotAccounts={polkadotAccounts}
          onValueChange={setPolkadotAccount}
          walletName={wallet?.title}
        />
        <PolkadotTokenList account={polkadotAccount?.address} />
      </div>
    );
  };

  const EthereumWalletHeader = () => {
    const { walletInfo } = useWalletInfo();
    const { open } = useAppKit();
    const [showEthereumIcon, setShowEthereumIcon] = useState(true);
    const ethereumAccount = useAtomValue(ethereumAccountAtom);

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
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-2">
            <Image
              src="/images/ethereum.png"
              width={20}
              height={20}
              alt="Ethereum"
              className="rounded-full"
            />
            <span className="font-medium">Ethereum</span>
          </div>
          <div
            role="button"
            onClick={async (e) => {
              e.stopPropagation();
              await open({ view: "Connect" });
            }}
            className="glass-button glass-button-small flex items-center cursor-pointer"
          >
            <span>Connect</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between w-full pr-2">
        <div className="flex items-center gap-2 min-w-0">
          {showEthereumIcon && (
            <Image
              src={getWalletIcon()}
              width={20}
              height={20}
              alt={walletInfo?.name || "Wallet"}
              className="rounded-full flex-shrink-0"
              onError={() => setShowEthereumIcon(false)}
            />
          )}
          <span className="font-medium">Ethereum</span>
          {ethereumAccount && (
            <span className="text-xs text-muted-foreground truncate mt-2px">
              {trimAccount(ethereumAccount, 10)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div
            role="button"
            onClick={async (e) => {
              e.stopPropagation();
              await open({ view: "Connect" });
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </div>
          <div
            role="button"
            onClick={handleDisconnect}
            className="text-gray-500 hover:text-red-600 transition-colors p-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  };

  const EthereumWalletContent = () => {
    const { walletInfo } = useWalletInfo();

    if (!walletInfo?.name) {
      return (
        <div className="text-sm text-muted-foreground text-center py-2">
          Connect your Ethereum wallet to view accounts
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <SelectedEthereumWallet />
        <EthereumTokenList />
      </div>
    );
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  return (
    <>
      <Sheet open={walletSheetOpen} onOpenChange={setWalletSheetOpen}>
        <SheetTrigger asChild>
          <button type="button">
            <WalletIcons />
          </button>
        </SheetTrigger>
        <SheetContent
          className="wallet-panel glass p-6 text-primary overflow-y-auto"
          aria-describedby={undefined}
        >
          <SheetHeader className="mb-4">
            <SheetTitle
              className="text-center font-semibold text-lg"
              style={{ color: "#212d41" }}
            >
              Wallets
            </SheetTitle>
          </SheetHeader>
          <Accordion
            type="multiple"
            value={openAccordions}
            onValueChange={setOpenAccordions}
            className="w-full"
          >
            <AccordionItem
              value="ethereum"
              className="border-b border-white/20"
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <EthereumWalletHeader />
              </AccordionTrigger>
              <AccordionContent>
                <EthereumWalletContent />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="polkadot"
              className="border-b border-white/20"
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <PolkadotWalletHeader />
              </AccordionTrigger>
              <AccordionContent>
                <PolkadotWalletContent />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SheetContent>
      </Sheet>
      <PolkadotWalletDialog />
    </>
  );
};
