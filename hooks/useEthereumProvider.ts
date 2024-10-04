import { initializeWeb3Modal } from "@/lib/client/web3modal";
import {
  ethersProviderAtom,
  windowEthereumAtom,
  windowEthereumErrorAtom,
  windowEthereumTypeAtom,
} from "@/store/ethereum";
import {
  useWeb3ModalError,
  useWeb3ModalProvider,
} from "@web3modal/ethers/react";
import { BrowserProvider } from "ethers";
import { useAtom } from "jotai";
import { useEffect } from "react";

export function useEthereumProvider() {
  initializeWeb3Modal();

  const [ethereumProvider, setEthereumProvider] = useAtom(windowEthereumAtom);
  const [ethereumProviderError, setEthereumProviderError] = useAtom(
    windowEthereumErrorAtom,
  );
  const [ethereumProviderType, setEthereumProviderType] = useAtom(
    windowEthereumTypeAtom,
  );
  const [ethersProvider, setEthersProvider] = useAtom(ethersProviderAtom);
  const { walletProvider, walletProviderType } = useWeb3ModalProvider();
  const { error } = useWeb3ModalError();

  useEffect(() => {
    if (walletProvider !== undefined && error === undefined) {
      setEthersProvider(new BrowserProvider(walletProvider));
      setEthereumProvider(walletProvider);
      setEthereumProviderType(walletProviderType ?? null);
    } else {
      setEthersProvider(null);
      setEthereumProvider(null);
      setEthereumProviderType(null);
    }

    if (typeof error === "string" || error instanceof String) {
      setEthereumProviderError((error as string) ?? null);
    }
    if (error !== undefined && "message" in (error as any)) {
      setEthereumProviderError((error as any).message);
    }
    if (error !== undefined) {
      console.error(error);
    }
  }, [
    error,
    walletProvider,
    walletProviderType,
    setEthereumProvider,
    setEthersProvider,
    setEthereumProviderType,
    setEthereumProviderError,
  ]);
  return {
    ethereum: ethereumProvider,
    ethereumType: ethereumProviderType,
    ethers: ethersProvider,
    error: ethereumProviderError,
  };
}
