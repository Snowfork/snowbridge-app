"use client"

import { Menubar, MenubarContent, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";
import { ethereumAccountAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from "@/store/ethereum";
import { WalletSelect } from '@talismn/connect-components';
import { useAtom, useAtomValue } from "jotai";
import { FC } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { polkadotAccountAtom, polkadotAccountsAtom, polkadotWalletModalOpenAtom, walletAtom } from "@/store/polkadot";
import Link from "next/link";
import { useConnectPolkadotWallet as usePolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import { useEthereumWallet } from "@/hooks/useEthereumWallet";

type MenuProps = { }

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

  const switchEthereumNetwork = useSwitchEthereumNetwork(11155111)
  const [connectToEthereumWallet, , error] = useConnectEthereumWallet()

  const EthereumWallet = () => {
    if (!ethereumAccount) {
      return (<Button onClick={connectToEthereumWallet}>Connect Ethereum</Button>)
    }
    return (<>
      {ethereumChainId !== 11155111 ? <Button onClick={switchEthereumNetwork}>Change Network</Button> : (<><p>Chain Id:</p><pre>{ethereumChainId}</pre></>)}
      <p>Ethereum Account:</p><pre>{ethereumAccount}</pre>
    </>)
  }

  const polkadotAccount = useAtomValue(polkadotAccountAtom)
  const wallet = useAtomValue(walletAtom)
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom)

  const PolkadotWallet = () => {
    if (!polkadotAccount) {
      return (<Button onClick={()=> setPolkadotWalletModalOpen(true)}>Connect Polkadot</Button>)
    }
    return (<>
      <p>Wallet:</p><pre>{wallet?.title}</pre>
      <p>Substrate Account:</p><pre>{polkadotAccount.address}</pre>
    </>)
  }

  return (
    <div className="flex items-center">
      <Menubar >
        <MenubarMenu>
          <MenubarTrigger>Wallet</MenubarTrigger>
          <MenubarContent className="text-sm">
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
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <PolkadotWalletDialog />
    </div>)
}