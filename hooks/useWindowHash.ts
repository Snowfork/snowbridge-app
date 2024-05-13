"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

export const useWindowHash = () => {
    const [hash, setHash] = useState<string|null>(window?.location.hash.replace(/^#/, '')??null)
    const params = useParams()
    useEffect(() => {
        const listener = (ev: HashChangeEvent) => {
            setHash(window.location.hash.replace(/^#/, ''))
        }
        window.addEventListener("hashchange", listener, false)
        return () => window.removeEventListener("hashchange", listener, false)
    }, [setHash, params])
    return hash
}