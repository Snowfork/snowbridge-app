import { Context, environment } from "@snowbridge/api";
import { atom } from "jotai";

export const snowbridgeContextAtom = atom<Context | null>(null)
export const snowbridgeContextEthChainIdAtom = atom<number | null>(null)

export const snowbridgeEnvNameAtom = atom((_) => process.env.NEXT_PUBLIC_SNOWBRIDGE_ENV || 'local_e2e')

export const snowbridgeEnvironmentAtom = atom<environment.SnowbridgeEnvironment>((get)=>{
    const env = environment.SNOWBRIDGE_ENV[get(snowbridgeEnvNameAtom)]
    if(env === undefined) throw new Error(`Unknown environment '${env}'`)
    return env
})