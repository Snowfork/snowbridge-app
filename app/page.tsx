"use client"

import { BridgeStatus } from "@/components/bridgeStatus";
import { TransferForm } from "@/components/transfer";
import { Menubar, MenubarContent, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { ethereumAccountAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from "@/store/common";
import { useAtom } from "jotai";
import { useEthereumWallet } from "@/hooks/useEthereumWallet";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";

const chainId = 11155111

export default function Home() {
  useEthereumWallet()

  const [ethereumAccount, setEvmAccount] = useAtom(ethereumAccountAtom)
  const [ethereumProvider] = useAtom(ethersProviderAtom)
  const [ethereumWalletAuthorized] = useAtom(ethereumWalletAuthorizedAtom)
  const [ethereumChainId] = useAtom(ethereumChainIdAtom)
  const switchEthereumNetwork = useSwitchEthereumNetwork(11155111)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const connectToEthereumWallet = (): void => {
    if (ethereumProvider == null) {
      setOpen(true)
      return
    }
    setLoading(true)
    void ethereumProvider
      .request({method: 'eth_requestAccounts'})
      .then((accounts) => {
        console.log(accounts)
        if (Array.isArray(accounts) && accounts.length > 0) {
          setEvmAccount(accounts[0] as string)
        } else {
          setEvmAccount(null)
        }
      })
      .finally(() => {
        console.log('A')
        setLoading(false)
      })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 lg:p-24">
      <div className="w-full max-w-5xl gap-4 flex flex-col">
        <div className="w-full place-items-center justify-between flex">
          <h1 className="text-2xl font-semibold lg:text-4xl">Snowbridge</h1>
          <div className="flex items-center">
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>Wallet</MenubarTrigger>
                <MenubarContent className="text-sm">
                  <p>Ethereum Account:</p>
                  {!ethereumWalletAuthorized ? <Button onClick={connectToEthereumWallet}>Connect Ethereum</Button> : (<pre>{ethereumAccount}</pre>)}
                  {ethereumChainId !== 11155111 ? <Button onClick={switchEthereumNetwork}>Change Network</Button> : (<><p>Chain Id:</p><pre>{ethereumChainId}</pre></>)}
                  <MenubarSeparator></MenubarSeparator>
                  <h1>Substrate:</h1>
                  <h1>0x0000</h1>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarContent>
                  <h1>Transfer History</h1>
                  <MenubarSeparator></MenubarSeparator>
                  <h1>GitHub</h1>
                  <h1>0x0000</h1>
                </MenubarContent>
                <MenubarTrigger>More</MenubarTrigger>
              </MenubarMenu>
            </Menubar>
          </div>
        </div>
        <div className="flex justify-center">
          <BridgeStatus />
        </div>
      </div>
      <div className="w-full max-w-5xl flex place-content-center">
        <TransferForm ethereumAccount={ethereumAccount} />
      </div>
      <div className="w-full max-w-5xl flex flex-col place-items-center text-sm">
        <div className="items-center">
          Brought by Snowfork
        </div>
        <p className="text-xs">Copyright © Snowfork 2024 (env: rococo_sepolia)</p>
      </div>
    </main>
  );
}
