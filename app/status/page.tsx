"use client"

import { Button } from "@/components/ui/button"
import { useBridgeStatus } from "@/hooks/useBridgeStatus"
import { snowbridgeContextAtom, snowbridgeEnvironmentAtom } from "@/store/snowbridge"
import { useAtomValue } from "jotai"
import { LucideLoaderCircle } from "lucide-react"
import { Suspense } from "react"

const StatusCard = () => {
  const snowbridgeEnv = useAtomValue(snowbridgeEnvironmentAtom)
  const context = useAtomValue(snowbridgeContextAtom)
  const {data: status, mutate} = useBridgeStatus(snowbridgeEnv, context)

  if (status == null) return (<Loading />)

  return (<div>
    <p>Content</p>
    <Button variant="link" onClick={()=> mutate()}>Refresh</Button>
  </div>)
}

const Loading = () => {
  return (<div className="flex text-primary underline-offset-4 hover:underline text-sm items-center"><LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" /></div>)
}

export default function Status() {
  return (
    <Suspense fallback={<Loading />}>
      <StatusCard />
    </Suspense>)
}