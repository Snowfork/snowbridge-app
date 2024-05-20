import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import {
  TransferHistory,
  TransferStatus,
  TransferUpdate,
  transfersAtom,
} from "@/store/transferHistory";
import { Context, toEthereum, toPolkadot } from "@snowbridge/api";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const TRACK_HISTORY_REFRESH_TIMER_INTERVAL = 3 * 1000 * 60; // 3 minute

const trackHistory = async (
  context: Context,
  env: SnowbridgeEnvironment,
  transfers: TransferHistory,
  reducer: (update: TransferUpdate) => void,
  appRouter: AppRouterInstance,
) => {
  console.log("Track History Running");

  for (const transfer of transfers.pending) {
    const destination = env.locations.find(
      (loc) => loc.id == transfer.form.destination,
    );
    if (destination === undefined) {
      console.log("cannot find destination ", transfer.form.destination);
      continue;
    }
    console.log("Tracking transaction ", transfer.id, destination.type);
    let status = "pending";
    try {
      switch (destination.type) {
        case "substrate": {
          const progress = await toPolkadot.trackSendProgressPolling(
            context,
            transfer.data,
          );
          status = progress.status;
          transfer.data = progress.result;
          break;
        }
        case "ethereum": {
          const progress = await toEthereum.trackSendProgressPolling(
            context,
            transfer.data,
          );
          status = progress.status;
          transfer.data = progress.result;
          break;
        }
      }
    } catch (err) {
      console.error("Error tracking transaction ", err);
      transfer.errorCount++;
      if (transfer.errorCount > 2) {
        transfer.status = TransferStatus.Failed;
      }
    }
    console.log("Tracking transaction complete ", transfer.id);
    if (status === "success") {
      transfer.status = TransferStatus.Complete;
      const transferUrl = `/history#${transfer.id}`;
      toast.info("Transfer Progress Updated", {
        position: "bottom-center",
        closeButton: true,
        id: "transfer_success",
        description: "Token transfer was succesfully initiated.",
        important: true,
        action: {
          label: "View",
          onClick: () => {
            appRouter.push(transferUrl);
          },
        },
      });
    }
    reducer({ action: "udpate", transfer });
  }
};

export const useTrackHistory = () => {
  const snowbridgeEnv = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const [transfers, transferReducer] = useAtom(transfersAtom);
  const appRouter = useRouter();
  useEffect(() => {
    if (context == null) return;
    console.log("Track History Installed");
    const intervalId = setInterval(
      () =>
        trackHistory(
          context,
          snowbridgeEnv,
          transfers,
          transferReducer,
          appRouter,
        ),
      TRACK_HISTORY_REFRESH_TIMER_INTERVAL,
    );
    return () => {
      console.log("Track History Uninstalled");
      clearInterval(intervalId);
    };
  }, [context, transfers, transferReducer, snowbridgeEnv, appRouter]);
};
