"use client"

import { blake2AsU8a, encodeAddress } from "@polkadot/util-crypto"
import { u8aToHex } from "@polkadot/util"
import { status, Context, utils, environment } from "@snowbridge/api"
import useSWR from "swr"
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment"

//export const REFRESH_INTERVAL: number = 5 * 60 * 1000 // 5 minutes
export const REFRESH_INTERVAL: number = 5 * 1000 // 1 minutes

export interface AccountInfo { name: string, type: 'ethereum' | 'substrate', account: string, balance: bigint }

export type BridgeStatus = {
  statusInfo: status.BridgeStatusInfo,
  channelStatusInfos: { name: string, status: status.ChannelStatusInfo }[]
  assetHubChannel: status.ChannelStatusInfo
  relayers: AccountInfo[]
  accounts: AccountInfo[]
}

const fetchStatus = async ([env, context]:[SnowbridgeEnvironment, Context|null]): Promise<BridgeStatus | null> => {
  if(context === null) return null

  const { config } = env

  const bridgeStatusInfo = await status.bridgeStatusInfo(context)
  const assethub = await status.channelStatusInfo(context, utils.paraIdToChannelId(config.ASSET_HUB_PARAID))
  const primaryGov = await status.channelStatusInfo(context, config.PRIMARY_GOVERNANCE_CHANNEL_ID)
  const secondaryGov = await status.channelStatusInfo(context, config.SECONDARY_GOVERNANCE_CHANNEL_ID)

  const accounts: AccountInfo[] = []
  const assetHubSovereignAddress = utils.paraIdToSovereignAccount("sibl", config.ASSET_HUB_PARAID)
  const assetHubSovereignBalance = BigInt(((await context.polkadot.api.bridgeHub.query.system.account(assetHubSovereignAddress)).toPrimitive() as any).data.free)
  accounts.push({ name: "Asset Hub Sovereign", type: "substrate", account: encodeAddress(assetHubSovereignAddress), balance: assetHubSovereignBalance })

  const assetHubAgentAddress = await context.ethereum.contracts.gateway.agentOf(
    utils.paraIdToAgentId(context.polkadot.api.bridgeHub.registry, config.ASSET_HUB_PARAID)
  )
  const assetHubAgentBalance = (await context.ethereum.api.getBalance(assetHubAgentAddress))
  accounts.push({ name: "Asset Hub Agent", type: "ethereum", account: assetHubAgentAddress, balance: assetHubAgentBalance })

  const bridgeHubAgentId = u8aToHex(blake2AsU8a("0x00", 256))
  let bridgeHubAgentAddress = await context.ethereum.contracts.gateway.agentOf(bridgeHubAgentId)
  let bridgeHubAgentBalance = await context.ethereum.api.getBalance(bridgeHubAgentAddress)
  accounts.push({ name: "Bridge Hub Agent", type: "ethereum", account: bridgeHubAgentAddress, balance: bridgeHubAgentBalance })

  const relayers: AccountInfo[] = []
  for (const relayer of config.RELAYERS) {
    let balance = 0n
    switch (relayer.type) {
      case "ethereum":
        balance = await context.ethereum.api.getBalance(relayer.account)
        break
      case "substrate":
        balance = BigInt(((await context.polkadot.api.bridgeHub.query.system.account(relayer.account)).toPrimitive() as any).data.free)
        break
    }
    relayers.push({ name: relayer.name, account: relayer.account, balance: balance, type: relayer.type })
  }

  return {
    statusInfo: bridgeStatusInfo,
    assetHubChannel: assethub,
    channelStatusInfos: [
      { name: "Asset Hub", status: assethub },
      { name: "Primary Governance", status: primaryGov },
      { name: "Secondary Governance", status: secondaryGov },
    ],
    relayers,
    accounts,
  }
}

export const useBridgeStatus = (env: SnowbridgeEnvironment, context: Context|null): BridgeStatus | null => {
  const { data } = useSWR([env, context], fetchStatus, { refreshInterval: REFRESH_INTERVAL, suspense: true, fallbackData: null })
  return data
}