"use client"

import { FC, Suspense } from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"
import Link from "next/link"
import { LucideBarChart, LucideLoaderCircle } from "lucide-react"
import { useBridgeStatus } from "@/hooks/useBridgeStatus"
import { useAtomValue } from "jotai"
import { snowbridgeContextAtom, snowbridgeEnvironmentAtom } from "@/store/snowbridge"
import { formatTime } from "@/lib/utils"

const ACCEPTABLE_BRIDGE_LATENCY = 28800 // 8 hours

const StatusCard = () => {
  const snowbridgeEnv = useAtomValue(snowbridgeEnvironmentAtom)
  const context = useAtomValue(snowbridgeContextAtom)
  const { data: bridgeStatus } = useBridgeStatus(snowbridgeEnv, context)

  if (bridgeStatus == null) return (<Loading />)

  const toPolkadot = {
    lightClientLatencyIsAcceptable: bridgeStatus.statusInfo.toPolkadot.latencySeconds < ACCEPTABLE_BRIDGE_LATENCY,
    bridgeOperational: bridgeStatus.statusInfo.toPolkadot.operatingMode.outbound === 'Normal' && bridgeStatus.statusInfo.toPolkadot.operatingMode.beacon === 'Normal',
    channelOperational: bridgeStatus.assetHubChannel.toPolkadot.operatingMode.outbound === 'Normal',
  }
  const toPolkadotOperatingMode =
    !toPolkadot.bridgeOperational || !toPolkadot.channelOperational ? "Halted"
      : !toPolkadot.lightClientLatencyIsAcceptable ? "Delayed"
        : "Normal"
  const toPolkadotStyle = toPolkadotOperatingMode === "Normal" ? "text-green-700" : "text-red-700"

  const toEthereum = {
    bridgeOperational: bridgeStatus.statusInfo.toEthereum.operatingMode.outbound === 'Normal',
    lightClientLatencyIsAcceptable: bridgeStatus.statusInfo.toEthereum.latencySeconds < ACCEPTABLE_BRIDGE_LATENCY,
  }
  const toEthereumOperatingMode = !toEthereum.bridgeOperational ? "Halted" : !toEthereum.lightClientLatencyIsAcceptable ? "Delayed" : "Normal"
  const toEthereumStyle = toEthereumOperatingMode === "Normal" ? "text-green-700" : "text-red-700"

  let overallStatus = toEthereumOperatingMode
  if(toEthereumOperatingMode === "Normal") {
    overallStatus = toPolkadotOperatingMode;
  }
  const overallStyle = toEthereumOperatingMode === "Normal" ? "text-green-700" : "text-red-700"

  return (<HoverCard openDelay={100}>
    <HoverCardTrigger asChild>
      <div className="text-primary underline-offset-4 hover:underline text-sm">Bridge Status: <span className={overallStyle}>{overallStatus}</span></div>
    </HoverCardTrigger>
    <HoverCardContent className="w-auto">
      <div className="flex place-items-center space-x-4">
        <LucideBarChart />
        <div className="space-y-1">
          <p>To Polkadot: <span className={toPolkadotStyle}>{toPolkadotOperatingMode} {formatTime(bridgeStatus.statusInfo.toPolkadot.latencySeconds)}</span></p>
          <p>To Ethereum: <span className={toEthereumStyle}>{toEthereumOperatingMode} {formatTime(bridgeStatus.statusInfo.toEthereum.latencySeconds)}</span></p>
          <Link className="text-xs" href="/status">See more</Link>
        </div>
      </div>
    </HoverCardContent>
  </HoverCard>)
}

const Loading = () => {
  return <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">Fetching Bridge Status <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" /></div>
}

export const BridgeStatus: FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <StatusCard />
    </Suspense>)
}