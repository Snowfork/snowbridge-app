import { Transfer } from "@/store/transferHistory";
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
      icon: <Check size={16} />,
      style: "bg-emerald-500/20 border-white/40 text-emerald-200",
    },
    [historyV2.TransferStatus.Pending]: {
      icon: <Loader2 size={16} className="animate-spin" />,
      style: "bg-amber-500/20 border-white/40 text-amber-200",
    },
    [historyV2.TransferStatus.Failed]: {
      icon: <AlertCircle size={16} />,
      style: "bg-red-500/20 border-white/40 text-red-200",
    },
  };

  const config = statusConfig[transfer.status];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-full",
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
