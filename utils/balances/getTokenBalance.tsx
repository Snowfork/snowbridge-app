'use client'
import { Context, assets, environment } from '@snowbridge/api'

export async function getTokenBalance(
  context: Context,
  token: string,
  ethereumChainId: bigint,
  source: environment.TransferLocation,
  sourceAccount: string
): Promise<{
  balance: bigint
  gatewayAllowance?: bigint
}> {
  switch (source.type) {
    case 'substrate': {
      if (source.paraInfo?.paraId === undefined) {
        throw Error(`ParaId not configured for source ${source.name}.`)
      }
      const parachain =
        context.polkadot.api.parachains[source.paraInfo?.paraId] ??
        context.polkadot.api.assetHub
      const location = assets.erc20TokenToAssetLocation(
        parachain.registry,
        ethereumChainId,
        token
      )
      const balance = await assets.palletAssetsBalance(
        parachain,
        location,
        sourceAccount,
        'foreignAssets'
      )
      return { balance: balance ?? 0n, gatewayAllowance: undefined }
    }
    case 'ethereum': {
      return await assets.assetErc20Balance(context, token, sourceAccount)
    }
    default:
      throw Error(`Unknown source type ${source.type}.`)
  }
}
export const errorMessage = (err: any) => {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`
  }
  return 'Unknown error'
}
