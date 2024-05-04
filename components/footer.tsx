'use client'

import { snowbridgeEnvNameAtom } from "@/store/snowbridge"
import { useAtomValue } from "jotai"

export function Footer() {
    const envName = useAtomValue(snowbridgeEnvNameAtom)
    return (<p className="text-xs py-2">Copyright © Snowfork 2024 (env: {envName})</p>)
}