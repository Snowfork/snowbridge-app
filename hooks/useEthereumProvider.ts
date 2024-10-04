import { initializeWeb3Modal } from "@/lib/client/web3modal";
import {
  ethersProviderAtom,
  windowEthereumAtom,
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
  const [ethereumProviderType, setEthereumProviderType] = useAtom(
    windowEthereumTypeAtom,
  );
  const [ethersProvider, setEthersProvider] = useAtom(ethersProviderAtom);
  const { walletProvider, walletProviderType } = useWeb3ModalProvider();
  const { error } = useWeb3ModalError();

  useEffect(() => {
    console.log(error);
    if (walletProvider !== undefined && error === undefined) {
      setEthersProvider(new BrowserProvider(walletProvider));
      setEthereumProvider(walletProvider);
      setEthereumProviderType(walletProviderType ?? null);
    } else {
      setEthersProvider(null);
      setEthereumProvider(null);
      setEthereumProviderType(null);
    }
  }, [
    error,
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
    error,
  };
}
