import { initializeWeb3Modal } from "@/lib/client/web3modal";
import {
  ethersProviderAtom,
  windowEthereumAtom,
  windowEthereumTypeAtom,
} from "@/store/ethereum";
import { useWeb3ModalProvider } from "@web3modal/ethers/react";
import { BrowserProvider } from "ethers";
import { useAtom } from "jotai";
import { useEffect } from "react";

export function useEthereumProvider() {
  initializeWeb3Modal();

  const [ethereumProvider, setEthereumProvider] = useAtom(windowEthereumAtom);
  const [ethereumProviderType, setEthereumProviderType] = useAtom(
    windowEthereumTypeAtom,
  );
  const [ethersProvider, setEthersProvider] = useAtom(ethersProviderAtom);
  const { walletProvider, walletProviderType } = useWeb3ModalProvider();

  useEffect(() => {
    if (walletProvider !== undefined) {
      setEthereumProvider(walletProvider);
      setEthereumProviderType(walletProviderType ?? null);
      const browserProvider = new BrowserProvider(walletProvider);
      setEthersProvider(browserProvider);
    }
  }, [
    walletProvider,
    walletProviderType,
    setEthereumProvider,
    setEthersProvider,
    setEthereumProviderType,
  ]);
  return {
    ethereum: ethereumProvider,
    ethereumType: ethereumProviderType,
    ethers: ethersProvider,
  };
}
