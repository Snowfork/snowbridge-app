"use client"

import { Menubar, MenubarContent, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { useConnectPolkadotWallet as usePolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import { useEthereumWallet } from "@/hooks/useEthereumWallet";
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";
import { ethereumAccountAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom, polkadotWalletModalOpenAtom, walletAtom, walletNameAtom } from "@/store/polkadot";
import { WalletSelect } from '@talismn/connect-components';
import { useAtom, useAtomValue } from "jotai";
import Link from "next/link";
import { FC } from "react";
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

export const Menu: FC<MenuProps> = ({ }) => {
  useEthereumWallet()
  usePolkadotWallet()

  const ethereumAccount = useAtomValue(ethereumAccountAtom)
  const ethereumProvider = useAtomValue(ethersProviderAtom)
  const ethereumWalletAuthorized = useAtomValue(ethereumWalletAuthorizedAtom)
  const ethereumChainId = useAtomValue(ethereumChainIdAtom)

  const switchEthereumNetwork = useSwitchEthereumNetwork(chainId)
  const [connectToEthereumWallet, , error] = useConnectEthereumWallet()

  const EthereumWallet = () => {
    if (!ethereumAccount) {
      return (<Button onClick={connectToEthereumWallet}>Connect Ethereum</Button>)
    }
    if (ethereumChainId !== chainId) {
      return (<>
        <h1 className="font-semibold">Ethereum</h1>
        <Button variant="destructive" onClick={switchEthereumNetwork}>Wrong Network</Button>
      </>)
    }
    return (<>
      <h1 className="font-semibold">Ethereum</h1>
      <div className="text-xs">
        <p>Account:</p><Button className="w-full" variant="outline" onClick={() => alert('Change in wallet.')}>{trimAccount(ethereumAccount)}</Button>
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
      <Dialog open={ethereumWalletAuthorized == false && ethereumProvider === undefined}>
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
      </Dialog>
      <PolkadotWalletDialog />
    </div>)
}