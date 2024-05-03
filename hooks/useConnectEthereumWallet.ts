"use client"

import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum"
import { useAtom } from "jotai"
import { useCallback, useState } from "react"

export const useConnectEthereumWallet = (): ([() => Promise<void>, boolean, string | null]) => {
  const [ethereumProvider] = useAtom(ethersProviderAtom)
  const [, setEthereumAccount] = useAtom(ethereumAccountAtom)

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
      } else {
        setEthereumAccount(null)
      }
    }
    catch (err) {
      let message = 'Unknown Error'
      if (err instanceof Error) message = err.message
      setError(message)
    }
    setLoading(false)

  }, [ethereumProvider, setEthereumAccount, setError, setLoading])
  return [connectWallet, loading, error]
}