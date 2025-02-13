import {
  ethereumAccountAtom,
  ethereumAccountsAtom,
  ethereumChainIdAtom,
  windowEthereumAtom,
  windowEthereumErrorAtom,
} from "@/store/ethereum";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useAtomValue, useAtom } from "jotai";
import { useEffect } from "react";

export const useConnectEthereumWallet = () => {
  const windowEthereum = useAtomValue(windowEthereumAtom);
  const windowEthereumError = useAtomValue(windowEthereumErrorAtom);
  const [ethereumAccount, setEthereumAccount] = useAtom(ethereumAccountAtom);
  const [ethereumAccounts, setEthereumAccounts] = useAtom(ethereumAccountsAtom);
  const [ethereumChainId, setEthereumChainId] = useAtom(ethereumChainIdAtom);

  const { address, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  useEffect(() => {
    if (
      !isConnected ||
      address === undefined ||
      status === "disconnected" ||
      windowEthereum === null ||
      windowEthereumError !== null
    ) {
      setEthereumAccount(null);
      setEthereumAccounts([]);
      setEthereumChainId(null);
      return;
    }

    windowEthereum
      .request({
        method: "eth_requestAccounts",
      })
      .then((accounts) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          setEthereumAccount(accounts[0]);
          setEthereumAccounts(accounts);
        }

        if (address !== undefined) {
          setEthereumAccount(address);
        }
        if (chainId !== undefined) {
          setEthereumChainId(Number(chainId));
        }
      });
  }, [
    address,
    windowEthereumError,
    chainId,
    isConnected,
    status,
    windowEthereum,
    setEthereumChainId,
    setEthereumAccount,
    setEthereumAccounts,
  ]);

  return {
    account: ethereumAccount,
    accounts: ethereumAccounts,
    chainId: ethereumChainId,
  };
};
