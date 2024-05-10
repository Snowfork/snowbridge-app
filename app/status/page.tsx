"use client"

import { useBridgeStatus } from "@/hooks/useBridgeStatus"
import { snowbridgeContextAtom, snowbridgeEnvironmentAtom } from "@/store/snowbridge"
import { useAtomValue } from "jotai"
import { LucideLoaderCircle } from "lucide-react"
import { Suspense } from "react"

const StatusCard = () => {
  const snowbridgeEnv = useAtomValue(snowbridgeEnvironmentAtom)
  const context = useAtomValue(snowbridgeContextAtom)
  const status = useBridgeStatus(snowbridgeEnv, context)

  if (status == null) return (<Loading />)
  
  return (<p>Content</p>)
}

const Loading = () => {
  return <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center"><LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" /></div>
}

export default function Status() {
  return (
    <Suspense fallback={<Loading />}>
      <StatusCard />
    </Suspense>)
}