"use client";

import {
  ethereumAccountAtom,
  ethereumAccountsAtom,
  windowEthereumAtom,
} from "@/store/ethereum";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useState } from "react";

export const useConnectEthereumWallet = (): [
  () => Promise<void>,
  boolean,
  string | null,
] => {
  const windowEthereum = useAtomValue(windowEthereumAtom);
  const setEthereumAccount = useSetAtom(ethereumAccountAtom);
  const setEthereumAccounts = useSetAtom(ethereumAccountsAtom);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    if (windowEthereum == null) {
      return;
    }
    setLoading(true);
    try {
      const accounts: string[] = await windowEthereum.request({
        method: "eth_requestAccounts",
      });

      if (Array.isArray(accounts) && accounts.length > 0) {
        setEthereumAccount(accounts[0]);
        setEthereumAccounts(accounts);
      } else {
        setEthereumAccount(null);
        setEthereumAccounts([]);
      }
    } catch (err) {
      let message = "Unknown Error";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    }
    setLoading(false);
  }, [
    windowEthereum,
    setEthereumAccount,
    setEthereumAccounts,
    setError,
    setLoading,
  ]);
  return [connectWallet, loading, error];
};
