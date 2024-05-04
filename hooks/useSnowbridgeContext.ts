import { snowbridgeContextAtom, snowbridgeContextEthChainIdAtom, snowbridgeEnvironmentAtom } from "@/store/snowbridge"
import { Context, contextFactory } from '@snowbridge/api'
import { Config } from "@snowbridge/api/dist/environment"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useEffect, useState } from "react"


const connectSnowbridgeContext = async (config: Config) => {
  const k = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
  const context = await contextFactory({
    ethereum: { execution_url: config.ETHEREUM_WS_API(k), beacon_url: config.BEACON_HTTP_API },
    polkadot: {
      url: {
        bridgeHub: config.BRIDGE_HUB_WS_URL,
        assetHub: config.ASSET_HUB_WS_URL,
        relaychain: config.RELAY_CHAIN_WS_URL,
        parachains: config.PARACHAINS,
      },
    },
    appContracts: {
      gateway: config.GATEWAY_CONTRACT,
      beefy: config.BEEFY_CONTRACT,
    },
  })

  const chainId: number = Number((await context.ethereum.api.getNetwork()).chainId.toString())
  return { context, chainId }
}

export const useSnowbridgeContext = (): [Context | null, boolean, string | null] => {
  const [context, setContext] = useAtom(snowbridgeContextAtom)
  const setChainId = useSetAtom(snowbridgeContextEthChainIdAtom)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { config } = useAtomValue(snowbridgeEnvironmentAtom)

  useEffect(() => {
    setLoading(true)
    connectSnowbridgeContext(config)
      .then(result => { setLoading(false); setContext(result.context); setChainId(result.chainId) })
      .catch(error => {
        let message = 'Unknown Error'
        if (error instanceof Error) message = error.message
        setLoading(false)
        setError(message)
      })
  }, [setContext, setLoading, setError])

  return [context, loading, error]
}