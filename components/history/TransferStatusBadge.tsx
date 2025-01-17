import { Transfer } from "@/store/transferHistory";
import { Badge } from "../ui/badge";
import { assets, environment, history } from "@snowbridge/api";
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
    history.TransferStatus.Failed == transfer.status
      ? " bg-destructive"
      : history.TransferStatus.Pending == transfer.status
        ? ""
        : "bg-secondary";
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-4 mr-2 col-span-1 place-self-center badge",
        badgeStyle,
        className,
      )}
    >
      {history.TransferStatus[transfer.status]}
    </Badge>
  );
}
