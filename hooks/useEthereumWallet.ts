"use client"

import { EthereumProvider, ethereumAccountAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from '@/store/common'
import { useAtom } from 'jotai'
import { useEffect } from 'react'


export const useEthereumWallet = () => {
  const [ethereumAccount] = useAtom(ethereumAccountAtom)
  const [ethereumProvider, setEthereumProvider] = useAtom(ethersProviderAtom)

  const [, setEthereumAccount] = useAtom(ethereumAccountAtom)
  const [, setEthereumChainId] = useAtom(ethereumChainIdAtom)

  const [ethereumWalletAuthorized, setEthereumWalletAuthorized] = useAtom(ethereumWalletAuthorizedAtom)

  useEffect(() => {
    if (ethereumProvider != null) return
    const init = async (): Promise<void> => {
      const { default: detectEthereumProvider } = await import(
        '@metamask/detect-provider'
      )
      const provider = await detectEthereumProvider({ silent: true })
      if (provider == null) return
      let ethereum = provider as any as EthereumProvider
      setEthereumProvider(ethereum)
      const updateAccounts = (accounts: unknown): void => {
        const account = (accounts as string[])[0]
        setEthereumAccount(account ?? null)
      }
      const updateChainId = (chainId: unknown): void => {
        setEthereumChainId(Number.parseInt(chainId as string, 16))
      }

      ethereum.on('accountsChanged', updateAccounts)
      ethereum.on('chainChanged', updateChainId)
      void ethereum.request({ method: 'eth_chainId' }).then(updateChainId)
      if (ethereumWalletAuthorized) {
        ethereum
          .request({ method: 'eth_requestAccounts' })
          .then((accounts: string[]) => {
            const account = accounts[0]
            setEthereumAccount(account ?? null)
          })
          .catch((error: any) => {
            // User rejected
            if (error.code === 4001) {
              setEthereumWalletAuthorized(false)
            } else {
              throw error
            }
          })
      }
    }

    void init()
  }, [
    ethereumProvider,
    ethereumWalletAuthorized,
    setEthereumProvider,
    setEthereumAccount,
    setEthereumWalletAuthorized,
    setEthereumChainId
  ])

  useEffect(() => {
    if (ethereumAccount != null) {
      setEthereumWalletAuthorized(true)
    }
    if(ethereumAccount == null) {
      setEthereumWalletAuthorized(false)
    }
  }, [ethereumAccount, setEthereumWalletAuthorized])
}