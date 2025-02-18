import { getModalError, initializeWeb3Modal } from "@/lib/client/web3modal";
import {
  ethersProviderAtom,
  windowEthereumAtom,
  windowEthereumErrorAtom,
  windowEthereumTypeAtom,
} from "@/store/ethereum";
import { useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider, Eip1193Provider } from "ethers";
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
  const { walletProvider, walletProviderType } = useAppKitProvider("eip155");
  const error = getModalError();

  useEffect(() => {
    if (walletProvider !== undefined && error === "") {
      setEthersProvider(new BrowserProvider(walletProvider as Eip1193Provider));
      setEthereumProvider(walletProvider as Eip1193Provider);
      console.dir(walletProvider);
      setEthereumProviderType(walletProviderType ?? null);
    } else {
      setEthersProvider(null);
      setEthereumProvider(null);
      setEthereumProviderType(null);
    }

    if (typeof error === "string" && error !== "") {
      setEthereumProviderError((error as string) ?? null);
    }
    if (error !== undefined && error !== "") {
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
