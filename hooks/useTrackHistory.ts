import { snowbridgeContextAtom, snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { Transfer, TransferStatus, TransferUpdate, transfersAtom } from "@/store/transferHistory";
import { Context, toEthereum, toPolkadot } from "@snowbridge/api";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

const TRACK_HISTORY_REFRESH_TIMER_INTERVAL = 1000 * 60 // 1 minute

const trackHistory = async (context: Context, env: SnowbridgeEnvironment, transfers: Transfer[], reducer: (update: TransferUpdate) => void) => {
    console.log('Track History Running')
    for (const transfer of transfers) {
        console.log('Tracking transaction ', transfer.id)
        if (transfer.status !== TransferStatus.InProgress) { continue }
        const destination = env.locations.find(loc => loc.id == transfer.form.destination);
        if (destination === undefined) { console.log('cannot find destination ', transfer.form.destination); continue; }
        let status = "pending"
        switch (destination.type) {
            case "substrate": {
                const progress = (await toPolkadot.trackSendProgressPolling(context, transfer.data))
                status = progress.status
                transfer.data = progress.result
                break;
            }
            case "ethereum": {
                const progress = (await toEthereum.trackSendProgressPolling(context, transfer.data))
                status = progress.status
                transfer.data = progress.result
                break;
            }
        }
        if (status === "success") {
            // TODO: check error and set error
            transfer.status = TransferStatus.Complete
        }
        reducer({ action: "udpate", transfer })
    }
}

export const useTrackHistory = () => {
    const snowbridgeEnv = useAtomValue(snowbridgeEnvironmentAtom)
    const context = useAtomValue(snowbridgeContextAtom)
    const [transfers, transferReducer] = useAtom(transfersAtom)
    useEffect(() => {
        if (context == null) return;
        console.log('Track History Installed')
        trackHistory(context, snowbridgeEnv, transfers, transferReducer)
        const intervalId = setInterval(() => trackHistory(context, snowbridgeEnv, transfers, transferReducer), TRACK_HISTORY_REFRESH_TIMER_INTERVAL)
        return () => { console.log('Track History Uninstalled'); clearInterval(intervalId) }
    }, [context, transfers, transferReducer])
}