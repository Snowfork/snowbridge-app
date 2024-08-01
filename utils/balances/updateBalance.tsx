'use client'
import { formatBalance } from '@/lib/utils'
import { Context, assets, environment } from '@snowbridge/api'
import { getTokenBalance } from './getTokenBalance'
import { ErrorInfo } from '../types'

export function updateBalance(
  context: Context,
  ethereumChainId: number,
  source: environment.TransferLocation,
  sourceAccount: string,
  token: string,
  tokenMetadata: assets.ERC20Metadata,
  setBalanceDisplay: (_: string) => void,
  setError: (_: ErrorInfo | null) => void
) {
  getTokenBalance(
    context,
    token,
    BigInt(ethereumChainId),
    source,
    sourceAccount
  )
    .then((result) => {
      let allowance = ''
      if (result.gatewayAllowance !== undefined) {
        allowance = ` (Allowance: ${formatBalance(
          result.gatewayAllowance ?? 0n,
          Number(tokenMetadata.decimals)
        )} ${tokenMetadata.symbol})`
      }
      setBalanceDisplay(
        `${formatBalance(result.balance, Number(tokenMetadata.decimals))} ${
          tokenMetadata.symbol
        } ${allowance}`
      )
    })
    .catch((err) => {
      console.error(err)
      setBalanceDisplay('unknown')
      setError({
        title: 'Error',
        description: `Could not fetch asset balance.`,
        errors: [],
      })
    })
}
