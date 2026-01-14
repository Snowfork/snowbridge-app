import { Transfer } from "@/store/transferActivity";
import { historyV2 } from "@snowbridge/api";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertCircle } from "lucide-react";

interface TransferStatusBadgeProps {
  className?: string;
  transfer: Transfer;
  showLabel?: boolean;
}
export function TransferStatusBadge({
  className,
  transfer,
  showLabel = false,
}: TransferStatusBadgeProps) {
  const statusConfig = {
    [historyV2.TransferStatus.Complete]: {
      icon: <Check className="w-3 h-3 sm:w-4 sm:h-4" />,
      label: "Complete",
      style: "bg-emerald-500/20 border-white/40 text-emerald-900",
    },
    [historyV2.TransferStatus.Pending]: {
      icon: <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />,
      label: "Busy",
      style: "bg-amber-500/20 border-white/40 text-amber-900",
    },
    [historyV2.TransferStatus.Failed]: {
      icon: <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
      label: "Failed",
      style: "bg-red-500/20 border-white/40 text-red-900",
    },
  };

  const config = statusConfig[transfer.status];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "backdrop-blur-sm border",
        showLabel
          ? "gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5"
          : "w-5 h-5 sm:w-7 sm:h-7",
        config.style,
        className,
      )}
      title={historyV2.TransferStatus[transfer.status]}
    >
      {config.icon}
      {showLabel && (
        <span className="text-xs sm:text-sm font-medium">{config.label}</span>
      )}
    </span>
  );
}
