import { getModalError } from "@/lib/client/web3modal";
import {
  ethersProviderAtom,
  windowEthereumAtom,
  windowEthereumErrorAtom,
} from "@/store/ethereum";
import { useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider, Eip1193Provider } from "ethers";
import { useAtom } from "jotai";
import { useEffect } from "react";

export function useEthereumProvider() {
  const [ethereumProvider, setEthereumProvider] = useAtom(windowEthereumAtom);
  const [ethereumProviderError, setEthereumProviderError] = useAtom(
    windowEthereumErrorAtom,
  );
  const [ethersProvider, setEthersProvider] = useAtom(ethersProviderAtom);
  const { walletProvider } = useAppKitProvider("eip155");
  const error = getModalError();

  useEffect(() => {
    if (walletProvider !== undefined && error === "") {
      setEthersProvider(new BrowserProvider(walletProvider as Eip1193Provider));
      setEthereumProvider(walletProvider as Eip1193Provider);
    } else {
      setEthersProvider(null);
      setEthereumProvider(null);
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
    setEthereumProvider,
    setEthersProvider,
    setEthereumProviderError,
  ]);
  return {
    ethereum: ethereumProvider,
    ethers: ethersProvider,
    error: ethereumProviderError,
  };
}
