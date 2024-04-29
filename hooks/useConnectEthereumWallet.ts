import { ethereumAccountAtom, ethersProviderAtom } from "@/store/common"
import { useAtom } from "jotai"
import { useCallback, useState } from "react"

export const useConnectEthereumWallet = (): ([() => Promise<void>, boolean, string | undefined]) => {
  const [ethereumProvider] = useAtom(ethersProviderAtom)
  const [, setEthereumAccount] = useAtom(ethereumAccountAtom)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

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
    catch (e: any) {
      setError(e.message)
    }
    setLoading(false)

  }, [ethereumProvider, setEthereumAccount])
  return [connectWallet, loading, error]
}