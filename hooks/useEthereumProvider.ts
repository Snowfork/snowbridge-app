"use client";

import {
  ethereumAccountAtom,
  ethereumAccountsAtom,
  ethereumChainIdAtom,
  ethereumWalletAuthorizedAtom,
  ethersProviderAtom,
  windowEthereumAtom,
} from "@/store/ethereum";
import { AbstractProvider, BrowserProvider, Eip1193Provider } from "ethers";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

export const useEthereumProvider = () => {
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const setWindowEthereum = useSetAtom(windowEthereumAtom);
  const [ethereumProvider, setEthereumProvider] = useAtom(ethersProviderAtom);

  const setEthereumAccount = useSetAtom(ethereumAccountAtom);
  const setEthereumAccounts = useSetAtom(ethereumAccountsAtom);
  const setEthereumChainId = useSetAtom(ethereumChainIdAtom);

  const [ethereumWalletAuthorized, setEthereumWalletAuthorized] = useAtom(
    ethereumWalletAuthorizedAtom,
  );
  useEffect(() => {
    if (ethereumProvider != null) return;
    const init = async (): Promise<void> => {
      const { default: detectEthereumProvider } = await import(
        "@metamask/detect-provider"
      );
      const provider = await detectEthereumProvider<
        AbstractProvider & Eip1193Provider
      >({ silent: true });
      if (provider == null) return;
      setWindowEthereum(provider);
      setEthereumProvider(new BrowserProvider(provider));
      const updateAccounts = (accounts: string[]): void => {
        setEthereumAccount(accounts[0] ?? null);
        setEthereumAccounts(accounts);
      };
      const updateChainId = (chainId: unknown): void => {
        setEthereumChainId(Number.parseInt(chainId as string, 16));
      };

      provider.on("accountsChanged", updateAccounts);
      provider.on("chainChanged", updateChainId);
      void provider.request({ method: "eth_chainId" }).then(updateChainId);
      if (ethereumWalletAuthorized) {
        provider
          .request({ method: "eth_requestAccounts" })
          .then((accounts: string[]) => {
            setEthereumAccount(accounts[0] ?? null);
            setEthereumAccounts(accounts);
          })
          .catch((error: any) => {
            if (error.code === 4001) {
              setEthereumWalletAuthorized(false);
            } else {
              throw error;
            }
          });
      }
    };

    void init();
  }, [
    ethereumProvider,
    ethereumWalletAuthorized,
    setEthereumAccount,
    setEthereumAccounts,
    setEthereumChainId,
    setEthereumProvider,
    setEthereumWalletAuthorized,
    setWindowEthereum,
  ]);

  useEffect(() => {
    if (ethereumAccount != null) {
      setEthereumWalletAuthorized(true);
    }
    if (ethereumWalletAuthorized && ethereumAccount == null) {
      setEthereumWalletAuthorized(false);
    }
  }, [ethereumAccount, ethereumWalletAuthorized, setEthereumWalletAuthorized]);
};
