import { snowbridgeContextAtom, snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { Transfer, TransferHistory, TransferStatus, TransferUpdate, transfersAtom } from "@/store/transferHistory";
import { Context, toEthereum, toPolkadot } from "@snowbridge/api";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";

const TRACK_HISTORY_REFRESH_TIMER_INTERVAL = 1 * 1000 * 60 // 1 minute

const trackHistory = async (context: Context, env: SnowbridgeEnvironment, transfers: TransferHistory, reducer: (update: TransferUpdate) => void) => {
    console.log('Track History Running')

    let updates = 0
    for (const transfer of transfers.pending) {
        console.log('Tracking transaction ', transfer.id)
        if (transfer.status !== TransferStatus.InProgress) { continue }
        const destination = env.locations.find(loc => loc.id == transfer.form.destination);
        if (destination === undefined) { console.log('cannot find destination ', transfer.form.destination); continue; }
        let status = "pending"
        try {
            switch (destination.type) {
                case "substrate": {
                    const progress = await toPolkadot.trackSendProgressPolling(context, transfer.data)
                    status = progress.status
                    transfer.data = progress.result
                    break;
                }
                case "ethereum": {
                    const progress = await toEthereum.trackSendProgressPolling(context, transfer.data)
                    status = progress.status
                    transfer.data = progress.result
                    break;
                }
            }
        }
        catch (err) {
            console.error('Error tracking transaction ', err)
            transfer.status = TransferStatus.Failed
        }
        console.log('Tracking transaction complete ', transfer.id)
        if (status === "success") {
            // TODO: check error and set error
            transfer.status = TransferStatus.Complete
        }
        updates++
        reducer({ action: "udpate", transfer })
    }
    // force update to kick off the timer again.
    if(updates == 0) reducer({action: "remove", transfer: { id: "" } as any})
}

export const useTrackHistory = () => {
    const snowbridgeEnv = useAtomValue(snowbridgeEnvironmentAtom)
    const context = useAtomValue(snowbridgeContextAtom)
    const [transfers, transferReducer] = useAtom(transfersAtom)
    useEffect(() => {
        if (context == null) return;
        console.log('Track History Installed')
        const intervalId = setTimeout(() => trackHistory(context, snowbridgeEnv, transfers, transferReducer), TRACK_HISTORY_REFRESH_TIMER_INTERVAL)
        return () => { console.log('Track History Uninstalled'); clearInterval(intervalId) }
    }, [context, transfers, transferReducer])
}