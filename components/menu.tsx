"use client"

import { Menubar, MenubarContent, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { useConnectPolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import { useEthereumProvider } from "@/hooks/useEthereumProvider";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";
import { useTrackHistory } from "@/hooks/useTrackHistory";
import { trimAccount } from "@/lib/utils";
import { ethereumAccountAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom, polkadotWalletModalOpenAtom, walletAtom } from "@/store/polkadot";
import { snowbridgeContextAtom, snowbridgeContextEthChainIdAtom } from "@/store/snowbridge";
import { WalletSelect } from '@talismn/connect-components';
import { useAtom, useAtomValue } from "jotai";
import { Github, LucideAlertCircle, LucideBarChart, LucideBookText, LucideHistory, LucideLoaderCircle, LucideMenu, LucideSend, LucideWallet } from "lucide-react";
import Link from "next/link";
import { FC } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const PolkadotWalletDialog: FC = () => {
  const [open, setOpen] = useAtom(polkadotWalletModalOpenAtom)
  const [, setPolkadotAccount] = useAtom(polkadotAccountAtom)
  const [, setPolkadotAccounts] = useAtom(polkadotAccountsAtom)
  const [, setWallet] = useAtom(walletAtom)
  return (
    <WalletSelect
      dappName="Snowbridge"
      open={open}
      showAccountsList
      onWalletConnectClose={() => {
        setOpen(false)
      }}
      onWalletSelected={(wallet) => {
        if (wallet.installed === true) {
          setWallet(wallet)
        }
      }}
      onUpdatedAccounts={(accounts) => {
        if (accounts != null) {
          setPolkadotAccounts(accounts)
        }
      }}
      onAccountSelected={(account) => {
        setPolkadotAccount(account.address)
      }}
    />
  )
}

const InstallMetamaskDialog: FC<{ walletAuthorized: boolean, provider: any }> = ({ walletAuthorized, provider }) => {
  return (<Dialog open={walletAuthorized == false && provider === undefined}>
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
          onClick={() => window.open('https://metamask.io/')}
        >
          Install Metamask
        </Button>
        <Button
          variant="link"
          onClick={() => {
            window.location.reload()
          }}
        >
          Refresh
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>)
}

const LoadingDialog: FC<{ open: boolean, title: string, message: string, error?: boolean }> = ({ open: loading, title, message, error }) => {

  return (<Dialog open={loading}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="flex items-center">
          <>
            {error === true ? (<LucideAlertCircle className="mx-1 text-destructive" />) : (<LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />)}
          </>
          {message}
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>)
}

export const Menu: FC = () => {
  useEthereumProvider()
  useConnectPolkadotWallet()
  const [_, contextLoading, contextError] = useSnowbridgeContext()
  useTrackHistory()

  const ethereumAccount = useAtomValue(ethereumAccountAtom)
  const ethereumProvider = useAtomValue(ethersProviderAtom)
  const ethereumWalletAuthorized = useAtomValue(ethereumWalletAuthorizedAtom)
  const ethereumChainId = useAtomValue(ethereumChainIdAtom)
  const snowbridgeContext = useAtomValue(snowbridgeContextAtom)

  const contextEthereumChainId = useAtomValue(snowbridgeContextEthChainIdAtom)!

  const switchEthereumNetwork = useSwitchEthereumNetwork(contextEthereumChainId)
  const [connectToEthereumWallet, ethereumLoading, ethereumError] = useConnectEthereumWallet()

  if (ethereumProvider && ethereumWalletAuthorized && contextEthereumChainId !== null && ethereumChainId !== contextEthereumChainId && snowbridgeContext !== null) {
    toast.error("Wrong Ethereum network", {
      position: "bottom-center",
      closeButton: true,
      id: "switch_network",
      important: true,
      action: {
        label: "Switch Network",
        onClick: () => switchEthereumNetwork(),
      },
    })
  }

  const EthereumWallet = () => {
    if (!ethereumAccount) {
      return (<Button className="w-full" onClick={connectToEthereumWallet}>Connect Ethereum</Button>)
    }
    if (contextEthereumChainId !== null && ethereumChainId !== contextEthereumChainId) {
      return (<>
        <h1 className="font-semibold">Ethereum</h1>
        <Button className="w-full" variant="destructive" onClick={switchEthereumNetwork}>Switch Network</Button>
      </>)
    }
    return (<>
      <h1 className="font-semibold">Ethereum</h1>
      <div className="text-xs">
        <p>Account:</p><Button className="w-full" variant="outline" onClick={() => {
          toast.info("Select account in wallet.", {
            position: "bottom-center",
            closeButton: true,
            dismissible: true,
            id: "wallet_select",
            duration: 5000,
          })
        }}><pre className="inline">{trimAccount(ethereumAccount)}</pre></Button>
      </div>
    </>)
  }

  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom)
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom)
  const wallet = useAtomValue(walletAtom)
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom)

  const PolkadotWallet = () => {
    if (!polkadotAccount) {
      return (<Button className="w-full" onClick={() => setPolkadotWalletModalOpen(true)}>Connect Polkadot</Button>)
    }
    return (
      <div className="w-60">
        <h1 className="font-semibold">Polkadot</h1>
        <div className="text-xs">
          <p>Name: {polkadotAccount.name}</p>
          <p className="inline">Address: </p><pre className="inline">{trimAccount(polkadotAccount.address, 28)}</pre>
          <p>Wallet: <Button className="w-full" variant="outline" onClick={() => setPolkadotWalletModalOpen(true)}>{wallet?.title}</Button> </p>
          <p>Account:</p>
        </div>
        <Select onValueChange={(v) => setPolkadotAccount(v)} defaultValue={polkadotAccount.address ?? "none"}>
          <SelectTrigger>
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {polkadotAccounts?.map(acc => (<SelectItem key={acc.address} value={acc.address ?? "none"}><div>{acc.name}</div> <pre className="inline">{trimAccount(acc.address)}</pre></SelectItem>))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>)
  }

  return (
    <div className="flex items-center">
      <Menubar >
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/" className="flex items-center"><LucideSend /><p className="pl-2 hidden md:flex">Transfer</p></Link>
          </MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/status" className="flex items-center"><LucideBarChart /><p className="pl-2 hidden md:flex">Status</p></Link>
          </MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/history" className="flex items-center"><LucideHistory /><p className="pl-2 hidden md:flex">History</p></Link>
          </MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger><LucideWallet /><p className="pl-2 hidden md:flex">Wallets</p></MenubarTrigger>
          <MenubarContent align="center">
            <EthereumWallet />
            <MenubarSeparator></MenubarSeparator>
            <PolkadotWallet />
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarContent align="center">
            <Button className="flex items-center justify-start w-auto h-auto" variant="link" onClick={() => window.open("https://github.com/Snowfork/snowbridge")}>
              <Github className="w-[40px] h-[40px]" /><p>GitHub</p>
            </Button>
            <Button className="flex items-center justify-start w-auto h-auto" variant="link" onClick={() => window.open("https://docs.snowbridge.network/")}>
              <LucideBookText className="w-[40px] h-[40px]" /><p>Docs</p>
            </Button>
          </MenubarContent>
          <MenubarTrigger><LucideMenu /><p className="pl-2 hidden md:flex">More</p></MenubarTrigger>
        </MenubarMenu>
      </Menubar>
      <InstallMetamaskDialog provider={ethereumProvider} walletAuthorized={ethereumWalletAuthorized} />
      <LoadingDialog key='l0' open={contextLoading} title="Snowbridge" message="Connecting to Snowbridge..." />
      <LoadingDialog key='e0' open={!contextLoading && contextError !== null} title="Connection Error" message={contextError || 'Unknown Error.'} error={true} />
      <LoadingDialog key='l1' open={ethereumLoading} title="Ethereum Wallet" message="Waiting for Ethereum wallet..." />
      <LoadingDialog key='e1' open={!ethereumLoading && ethereumError !== null} title="Ethereum Wallet Error" message={ethereumError || 'Unknown Error.'} error={true} />
      <PolkadotWalletDialog />
    </div>)
}