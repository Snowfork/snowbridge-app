"use client"

import { FC } from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"
import Link from "next/link"
import { LucideBarChart } from "lucide-react"

export const BridgeStatus: FC = () => {
  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <div className="text-primary underline-offset-4 hover:underline text-sm">Bridge Status: <span className="text-red-600">Delayed</span></div>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto">
        <div className="flex place-items-center space-x-4">
          <LucideBarChart />
          <div className="space-y-1">
            <p>To Polkadot: <span className="text-green-700">Normal 10 min 5 secs</span></p>
            <p>To Ethereum: <span className="text-red-700">Delayed 32 min 6 secs</span></p>
            <Link className="text-xs" href="/status">See more</Link>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>)
}