import { snowbridgeContextAtom, snowbridgeEnvironmentAtom } from "@/store/snowbridge"
import { Context, contextFactory } from '@snowbridge/api'
import { useAtom, useAtomValue } from "jotai"
import { useEffect, useState } from "react"

export const useSnowbridgeContext = (): [Context | null, boolean, string | null] => {
  const [context, setContext] = useAtom(snowbridgeContextAtom)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { config } = useAtomValue(snowbridgeEnvironmentAtom)

  const k = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
  useEffect(() => {
    setLoading(true)
    contextFactory({
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
      .then(context => { setLoading(false); setContext(context) })
      .catch(error => {
        let message = 'Unknown Error'
        if (error instanceof Error) message = error.message
        setLoading(false)
        setError(message)
      })
  }, [setContext, setLoading, setError])

  return [context, loading, error]
}