"use client"

import { EthereumProvider, ethereumAccountAtom, ethereumAccountsAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from '@/store/ethereum'
import { useAtom, useSetAtom } from 'jotai'
import { useEffect } from 'react'


export const useEthereumProvider = () => {
  const [ethereumAccount] = useAtom(ethereumAccountAtom)
  const [ethereumProvider, setEthereumProvider] = useAtom(ethersProviderAtom)

  const setEthereumAccount = useSetAtom(ethereumAccountAtom)
  const setEthereumAccounts = useSetAtom(ethereumAccountsAtom)
  const setEthereumChainId = useSetAtom(ethereumChainIdAtom)

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
      const updateAccounts = (accounts: string[]): void => {
        setEthereumAccount(accounts[0] ?? null)
        setEthereumAccounts(accounts)
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
            setEthereumAccount(accounts[0] ?? null)
            setEthereumAccounts(accounts)
          })
          .catch((error: any) => {
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
    setEthereumAccounts,
    setEthereumWalletAuthorized,
    setEthereumChainId
  ])

  useEffect(() => {
    if (ethereumAccount != null) {
      setEthereumWalletAuthorized(true)
    }
    if (ethereumWalletAuthorized && ethereumAccount == null) {
      setEthereumWalletAuthorized(false)
    }
  }, [ethereumAccount, ethereumWalletAuthorized, setEthereumWalletAuthorized])
}