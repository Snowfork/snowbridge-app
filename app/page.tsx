"use client"

import { BridgeStatus } from "@/components/bridgeStatus";
import { Menu } from "@/components/menu";
import { TransferForm } from "@/components/transfer";
import { useConnectPolkadotWallet as usePolkadotWallet } from "@/hooks/useConnectPolkadotWallet";
import { useEthereumWallet } from "@/hooks/useEthereumWallet";
import { ethereumAccountAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from "@/store/ethereum";
import { useAtom } from "jotai";

const chainId = 11155111

export default function Home() {
  useEthereumWallet()
  usePolkadotWallet()

  const [ethereumAccount] = useAtom(ethereumAccountAtom)
  const [ethereumProvider] = useAtom(ethersProviderAtom)
  const [ethereumWalletAuthorized] = useAtom(ethereumWalletAuthorizedAtom)
  const [ethereumChainId] = useAtom(ethereumChainIdAtom)

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 lg:p-24">
      <div className="w-full max-w-5xl gap-4 flex flex-col">
        <div className="w-full place-items-center justify-between flex">
          <h1 className="text-2xl font-semibold lg:text-4xl">Snowbridge</h1>
          <Menu ethereumWalletAuthorized={ethereumWalletAuthorized} ethereumProvider={ethereumProvider} ethereumAccount={ethereumAccount} ethereumChainId={ethereumChainId} />
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
