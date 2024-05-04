"use client"

import { ethereumAccountAtom, ethereumAccountsAtom, ethersProviderAtom } from "@/store/ethereum"
import { useAtom, useSetAtom } from "jotai"
import { useCallback, useState } from "react"

export const useConnectEthereumWallet = (): ([() => Promise<void>, boolean, string | null]) => {
  const [ethereumProvider] = useAtom(ethersProviderAtom)
  const setEthereumAccount = useSetAtom(ethereumAccountAtom)
  const setEthereumAccounts = useSetAtom(ethereumAccountsAtom)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectWallet = useCallback(async () => {
    if (ethereumProvider == null) {
      return
    }
    setLoading(true)
    try {
      const accounts: string[] = await ethereumProvider
        .request({ method: 'eth_requestAccounts' })

      if (Array.isArray(accounts) && accounts.length > 0) {
        setEthereumAccount(accounts[0])
        setEthereumAccounts(accounts)
      } else {
        setEthereumAccount(null)
        setEthereumAccounts([])
      }
    }
    catch (err) {
      let message = 'Unknown Error'
      if (err instanceof Error) message = err.message
      setError(message)
    }
    setLoading(false)

  }, [ethereumProvider, setEthereumAccount, setEthereumAccounts, setError, setLoading])
  return [connectWallet, loading, error]
}