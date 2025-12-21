import { Transfer } from "@/store/transferActivity";
import { historyV2 } from "@snowbridge/api";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle } from "lucide-react";

interface TransferStatusBadgeProps {
  className?: string;
  transfer: Transfer;
}
export function TransferStatusBadge({
  className,
  transfer,
}: TransferStatusBadgeProps) {
  const statusConfig = {
    [historyV2.TransferStatus.Complete]: {
      icon: <Check className="w-3 h-3 sm:w-4 sm:h-4" />,
      style: "bg-emerald-500/20 border-white/40 text-emerald-200",
    },
    [historyV2.TransferStatus.Pending]: {
      icon: <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />,
      style: "bg-amber-500/20 border-white/40 text-amber-200",
    },
    [historyV2.TransferStatus.Failed]: {
      icon: <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
      style: "bg-red-500/20 border-white/40 text-red-200",
    },
  };

  const config = statusConfig[transfer.status];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full",
        "backdrop-blur-sm border",
        config.style,
        className,
      )}
      title={historyV2.TransferStatus[transfer.status]}
    >
      {config.icon}
    </span>
  );
}
