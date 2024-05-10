import { windowEthereumAtom } from '@/store/ethereum'
import { useAtomValue } from "jotai"
import { useCallback } from 'react'

export const useSwitchEthereumNetwork = (chainId: number): (() => Promise<void>) => {
    const ethereum = useAtomValue(windowEthereumAtom)
  
    const switchNetwork = useCallback(async () => {
      if (ethereum == null) return
      const chainIdHex = `0x${chainId.toString(16)}`
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{chainId: chainIdHex}],
        })
      } catch (switchError) {
        if ((switchError as {code: number}).code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
                {
                    "chainId": chainIdHex,
                    // "chainName": "Gnosis",
                    // "rpcUrls": [
                    //   "https://rpc.gnosischain.com"
                    // ],
                    // "iconUrls": [
                    //   "https://xdaichain.com/fake/example/url/xdai.svg",
                    //   "https://xdaichain.com/fake/example/url/xdai.png"
                    // ],
                    // "nativeCurrency": {
                    //   "name": "XDAI",
                    //   "symbol": "XDAI",
                    //   "decimals": 18
                    // },
                    // "blockExplorerUrls": [
                    //   "https://blockscout.com/poa/xdai/"
                    // ]
                  }
            ],
          })
        }
      }
    }, [ethereum, chainId])
  
    return switchNetwork
  }