"use client";

import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { useConnectPolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import {
  getEthereumProvider,
  useEthereumProvider,
} from "@/hooks/useEthereumProvider";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { cn } from "@/lib/cn";
import { trimAccount } from "@/utils/formatting";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
  walletAtom,
} from "@/store/polkadot";
import {
  relayChainNativeAssetAtom,
  snowbridgeEnvNameAtom,
} from "@/store/snowbridge";
import { WalletSelect } from "@talismn/connect-components";
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
import { FC, useEffect, useState } from "react";
import { ErrorDialog } from "./ErrorDialog";
import { SelectedEthereumWallet } from "./SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { track } from "@vercel/analytics/react";

const PolkadotWalletDialog: FC = () => {
  const [open, setOpen] = useAtom(polkadotWalletModalOpenAtom);
  const [, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const [, setPolkadotAccounts] = useAtom(polkadotAccountsAtom);
  const [, setWallet] = useAtom(walletAtom);
  return (
    <WalletSelect
      dappName="Snowbridge"
      open={open}
      showAccountsList
      onWalletConnectClose={() => {
        setOpen(false);
      }}
      onWalletSelected={(wallet) => {
        if (wallet.installed === true) {
          setWallet(wallet);
        }
      }}
      onUpdatedAccounts={(accounts) => {
        if (accounts != null) {
          setPolkadotAccounts(accounts);
        }
      }}
      onAccountSelected={(account) => {
        setPolkadotAccount(account.address);
      }}
    />
  );
};

const InstallMetamaskDialog: FC = () => {
  let [show, setShow] = useState(false);
  useEffect(() => {
    getEthereumProvider().then((p) => setShow(p === null));
  });
  if (show) {
    track("Install MetaMask");
  }
  return (
    <Dialog open={show}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Metamask Is Not Installed</DialogTitle>
          <DialogDescription>
            Please install the Metamask extension and refresh the page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="link"
            onClick={() => window.open("https://metamask.io/")}
          >
            Install Metamask
          </Button>
          <Button
            variant="link"
            onClick={() => {
              window.location.reload();
            }}
          >
            Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Menu: FC = () => {
  useEthereumProvider();
  const [_, contextLoading, contextError] = useSnowbridgeContext();
  const envName = useAtomValue(snowbridgeEnvNameAtom);
  const relayChainNativeAsset = useAtomValue(relayChainNativeAssetAtom);
  const [errorMessage, setErrorMessage] = useState(contextError);
  useConnectPolkadotWallet(relayChainNativeAsset?.ss58Format ?? 42);
  useConnectEthereumWallet();

  if (errorMessage) {
    console.error(errorMessage);
    setErrorMessage("There was an error connecting to Snowbridge.");
  }

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
    return (
      <>
        <h1 className="font-semibold py-2">Ethereum</h1>
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
      <InstallMetamaskDialog />
      <ErrorDialog
        open={!contextLoading && errorMessage !== null}
        title="Connection Error"
        description={errorMessage || "Unknown Error."}
      />
      <PolkadotWalletDialog />
    </div>
  );
};
