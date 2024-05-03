"use client"

import { Menubar, MenubarContent, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { useConnectPolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import { useEthereumProvider } from "@/hooks/useEthereumProvider";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";
import { EthereumProvider, ethereumAccountAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom, polkadotWalletModalOpenAtom, walletAtom } from "@/store/polkadot";
import { WalletSelect } from '@talismn/connect-components';
import { useAtom, useAtomValue } from "jotai";
import Link from "next/link";
import { FC } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const chainId = 11155111
const trimAccount = (account: string): string => {
  return account.substring(0, 6) + '...' + account.substring(account.length - 6);
}

type MenuProps = {}

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

const InstallMetamaskDialog: FC<{ walletAuthorized: boolean, provider: EthereumProvider | null }> = ({ walletAuthorized, provider }) => {
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

const LoadingDialog: FC<{ loading: boolean, title: string, message: string }> = ({ loading, title, message }) => {
  return (<Dialog open={loading}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {message}
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>)
}

export const Menu: FC<MenuProps> = ({ }) => {
  useEthereumProvider()
  useConnectPolkadotWallet()
  const [_, contextLoading, contextError] = useSnowbridgeContext()

  const ethereumAccount = useAtomValue(ethereumAccountAtom)
  const ethereumProvider = useAtomValue(ethersProviderAtom)
  const ethereumWalletAuthorized = useAtomValue(ethereumWalletAuthorizedAtom)
  const ethereumChainId = useAtomValue(ethereumChainIdAtom)

  const switchEthereumNetwork = useSwitchEthereumNetwork(chainId)
  const [connectToEthereumWallet, ethereumLoading, ethereumError] = useConnectEthereumWallet()

  if (ethereumProvider && ethereumWalletAuthorized && ethereumChainId !== chainId) {
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
    if (ethereumChainId !== chainId) {
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
        }}>{trimAccount(ethereumAccount)}</Button>
      </div>
    </>)
  }

  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom)
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom)
  const wallet = useAtomValue(walletAtom)
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom)

  const PolkadotWallet = () => {
    if (!polkadotAccount) {
      return (<Button onClick={() => setPolkadotWalletModalOpen(true)}>Connect Polkadot</Button>)
    }
    return (
      <div className="w-60">
        <h1 className="font-semibold">Polkadot</h1>
        <div className="text-xs">
          <p>Name: {polkadotAccount.name}</p>
          <p>Address: {trimAccount(polkadotAccount.address)}</p>
          <p>Wallet: <Button className="w-full" variant="outline" onClick={() => setPolkadotWalletModalOpen(true)}>{wallet?.title}</Button> </p>
          <p>Account:</p>
        </div>
        <Select onValueChange={(v) => setPolkadotAccount(v)} defaultValue={polkadotAccount.address ?? "none"}>
          <SelectTrigger>
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {polkadotAccounts?.map(acc => (<SelectItem key={acc.address} value={acc.address ?? "none"}><div>{acc.name}</div> {trimAccount(acc.address)}</SelectItem>))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>)
  }

  return (
    <div className="flex items-center">
      <Menubar >
        <MenubarMenu>
          <MenubarTrigger>Wallets</MenubarTrigger>
          <MenubarContent>
            <EthereumWallet />
            <MenubarSeparator></MenubarSeparator>
            <PolkadotWallet />
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarContent>
            <Link className="flex place-items-center space-x-4" href="/">
              <Avatar>
                <AvatarImage className="w-[90px]" src="icons8-transfer-52.png" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar><p>Transfer</p></Link>
            <Link className="flex place-items-center space-x-4" href="/history">
              <Avatar>
                <AvatarImage className="w-[90px]" src="icons8-history-96.png" />
                <AvatarFallback>H</AvatarFallback>
              </Avatar><p>History</p></Link>
            <MenubarSeparator></MenubarSeparator>
            <Link className="flex place-items-center space-x-4" href="https://github.com/Snowfork/snowbridge">
              <Avatar>
                <AvatarImage className="w-[90px]" src="icons8-github.svg" />
                <AvatarFallback>GH</AvatarFallback>
              </Avatar><p>GitHub</p>
            </Link>
          </MenubarContent>
          <MenubarTrigger>More</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
      <InstallMetamaskDialog provider={ethereumProvider} walletAuthorized={ethereumWalletAuthorized} />
      <LoadingDialog key='l0' loading={contextLoading} title="Snowbridge" message="Connecting to Snowbridge." />
      <LoadingDialog key='e0' loading={!contextLoading && contextError !== null} title="Connection Error" message={contextError || 'Unknown Error.'} />
      <LoadingDialog key='l1' loading={ethereumLoading} title="Ethereum Wallet" message="Waiting for Ethereum wallet." />
      <LoadingDialog key='e1' loading={!ethereumLoading && ethereumError !== null} title="Ethereum Wallet Error" message={ethereumError || 'Unknown Error.'} />
      <PolkadotWalletDialog />
    </div>)
}