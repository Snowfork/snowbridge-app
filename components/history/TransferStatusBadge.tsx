import { Transfer } from "@/store/transferHistory";
import { Badge } from "../ui/badge";
import { historyV2 } from "@snowbridge/api";
import { cn } from "@/lib/utils";

interface TransferStatusBadgeProps {
  className?: string;
  transfer: Transfer;
}
export function TransferStatusBadge({
  className,
  transfer,
}: TransferStatusBadgeProps) {
  const badgeStyle =
    historyV2.TransferStatus.Failed == transfer.status
      ? " bg-destructive"
      : historyV2.TransferStatus.Pending == transfer.status
        ? ""
        : "bg-secondary";
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-4 mr-2 col-span-1 place-self-center badge font-light",
        badgeStyle,
        className,
      )}
    >
      {historyV2.TransferStatus[transfer.status]}
    </Badge>
  );
}
