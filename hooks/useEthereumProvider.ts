"use client";

import {
  ethereumAccountAtom,
  ethereumAccountsAtom,
  ethereumChainIdAtom,
  ethersProviderAtom,
  windowEthereumAtom,
} from "@/store/ethereum";
import { AbstractProvider, BrowserProvider, Eip1193Provider } from "ethers";
import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";

export const getEthereumProvider = async () => {
  const { default: detectEthereumProvider } = await import(
    "@metamask/detect-provider"
  );
  const provider = await detectEthereumProvider<
    AbstractProvider & Eip1193Provider
  >({ silent: true });
  return provider;
};

export const useEthereumProvider = () => {
  const setWindowEthereum = useSetAtom(windowEthereumAtom);
  const [ethereumProvider, setEthereumProvider] = useAtom(ethersProviderAtom);

  const setEthereumAccount = useSetAtom(ethereumAccountAtom);
  const setEthereumAccounts = useSetAtom(ethereumAccountsAtom);
  const setEthereumChainId = useSetAtom(ethereumChainIdAtom);

  useEffect(() => {
    if (ethereumProvider != null) {
      return;
    }
    const init = async (): Promise<void> => {
      const provider = await getEthereumProvider();
      if (provider == null) {
        return;
      }
      const updateAccounts = (accounts: string[]): void => {
        setEthereumAccount(accounts[0] ?? null);
        setEthereumAccounts(accounts);
      };
      const updateChainId = (chainId: unknown): void => {
        setEthereumChainId(Number.parseInt(chainId as string, 16));
        setWindowEthereum(provider);
        setEthereumProvider(new BrowserProvider(provider));
      };

      provider.on("accountsChanged", updateAccounts);
      provider.on("chainChanged", updateChainId);
      void provider.request({ method: "eth_chainId" }).then(updateChainId);
      void provider
        .request({ method: "eth_requestAccounts" })
        .then(updateAccounts)
        .catch((error: any) => {
          if (error.code === 4001) {
            console.log();
          } else {
            throw error;
          }
        });
    };

    void init();
  }, [
    ethereumProvider,
    setEthereumAccount,
    setEthereumAccounts,
    setEthereumChainId,
    setEthereumProvider,
    setWindowEthereum,
  ]);
};
