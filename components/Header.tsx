"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { useSetAtom, useAtomValue, useAtom } from "jotai";
import { acceptedTermsOfUseAtom } from "@/store/termsOfUse";
import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { Menu as MenuIcon, X, Pencil, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useEffect, useContext, FC } from "react";
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
import { ImageWithFallback } from "./ui/image-with-fallback";
import { trimAccount } from "@/utils/formatting";
import { Button } from "./ui/button";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
  walletAtom,
  walletSheetOpenAtom,
  connectorInfoAtom,
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
import { useDisconnect } from "@luno-kit/react";

const Wallet: FC = () => {
  useEthereumProvider();
  const registry = useContext(RegistryContext)!;
  useConnectPolkadotWallet(registry.relaychain.ss58Format ?? 42);

  const wallet = useAtomValue(walletAtom);
  const setConnectorInfo = useSetAtom(connectorInfoAtom);
  const { disconnect: disconnectPolkadot } = useDisconnect();

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

  const WalletButton = () => {
    if (!isEthConnected && !isPolkadotConnected) {
      return (
        <button
          type="button"
          className="action-button"
          onClick={() => setWalletSheetOpen(true)}
        >
          Connect
        </button>
      );
    }

    return (
      <button
        type="button"
        className="flex items-center px-1 py-1 rounded-full border border-gray-600 cursor-pointer"
        onClick={() => setWalletSheetOpen(true)}
      >
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
      </button>
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
              disconnectPolkadot();
              setPolkadotAccount(null);
              setPolkadotAccounts([]);
              setConnectorInfo(null);
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

  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  return (
    <>
      <WalletButton />
      <Sheet open={walletSheetOpen} onOpenChange={setWalletSheetOpen}>
        <SheetContent
          className="wallet-panel glass p-6 text-primary overflow-y-auto"
          aria-describedby={undefined}
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center font-semibold text-lg">
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

export function Header() {
  const setAccepted = useSetAtom(acceptedTermsOfUseAtom);
  const envName = useAtomValue(snowbridgeEnvNameAtom);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = mounted && resolvedTheme === "dark"
    ? "/images/snowbridge-icon-dark.svg"
    : "/images/snowbridge-icon-light.svg";

  return (
    <header className="w-full px-6 py-4 flex items-center justify-between">
      {/* Desktop navigation */}
      <div className="hidden md:flex items-center">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Link href="/" className="flex items-center cursor-pointer">
              <Image
                src={logoSrc}
                width={32}
                height={32}
                alt="Snowbridge"
              />
              <h1 className="text-lg px-2 flex items-center">
                Snowbridge{" "}
                <svg
                  width="12px"
                  height="12px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="opacity-70 ml-1"
                >
                  <path
                    d="M10.6979 16.2453L6.31787 9.75247C5.58184 8.66118 6.2058 7 7.35185 7L16.6482 7C17.7942 7 18.4182 8.66243 17.6821 9.75247L13.3021 16.2453C12.623 17.2516 11.377 17.2516 10.6979 16.2453Z"
                    fill="currentColor"
                  />
                </svg>
              </h1>
            </Link>
          </HoverCardTrigger>
          <HoverCardContent
            className="w-56 dropdown-menu p-3 relative"
            align="start"
            sideOffset={8}
          >
            <div className="flex flex-col space-y-3">
              <a
                className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
                href="https://docs.snowbridge.network/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Docs
              </a>
              <a
                className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
                href="https://docs.snowbridge.network/security/bug-bounty"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bug Bounty
              </a>
              <a
                className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
                href="https://github.com/Snowfork/snowbridge-app/issues/new/choose"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report an Issue
              </a>
              <a
                className="text-xs text-gray-700 hover:text-gray-500 transition-colors cursor-pointer"
                onClick={() => setAccepted(false)}
              >
                Terms of Use
              </a>
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <a
                href="https://github.com/Snowfork/snowbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <Image
                  src="/images/github.svg"
                  width={16}
                  height={16}
                  alt="GitHub"
                />
              </a>
              <a
                href="https://x.com/_snowbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <Image
                  src="/images/twitter-x.svg"
                  width={16}
                  height={16}
                  alt="X (Twitter)"
                />
              </a>
            </div>
          </HoverCardContent>
        </HoverCard>

        {/* Navigation links in same container */}
        <nav className="flex items-center ml-5">
          <Link
            href="/send"
            className={`px-3 text-base transition-colors ${
              pathname === "/send"
                ? "text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Send
          </Link>
          <Link
            href="/activity"
            className={`px-3 text-base transition-colors ${
              pathname === "/activity"
                ? "text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Activity
          </Link>
        </nav>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden flex items-center w-full justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src={logoSrc}
            width={40}
            height={40}
            alt="Snowbridge"
          />
          <h1 className="text-2xl px-2 ml-2 text-gray-600">Snowbridge</h1>
        </Link>
        <button
          type="button"
          className="ml-auto p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <MenuIcon className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Desktop wallet and theme toggle */}
      <div className="hidden md:flex items-center gap-3">
        <ThemeToggle />
        <Wallet />
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 px-4 py-3 z-50">
          <div className="flex flex-wrap gap-2 justify-center glass rounded-2xl p-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Transfer
            </Link>
            {envName === "westend_sepolia" ? null : (
              <Link
                href="/switch"
                className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Polar Path
              </Link>
            )}
            {envName === "polkadot_mainnet" ? (
              <Link
                href="/kusama"
                className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kusama
              </Link>
            ) : null}
            <Link
              href="/activity"
              className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Activity
            </Link>
            <a
              className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium cursor-pointer"
              onClick={() => {
                setMobileMenuOpen(false);
                setAccepted(false);
              }}
            >
              Terms of Use
            </a>
            <a
              href="https://docs.snowbridge.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Docs
            </a>
            {/* Mobile wallet button and theme toggle */}
            <div className="mt-2 w-full flex items-center justify-center gap-3">
              <ThemeToggle />
              <Wallet />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
