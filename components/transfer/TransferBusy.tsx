import { FC } from "react";
import { Button } from "../ui/button";
import { LucideLoaderCircle } from "lucide-react";

interface TransferBusyProps {
  message?: string;
  onBack?: () => Promise<unknown> | unknown;
}
export const TransferBusy: FC<TransferBusyProps> = ({ message, onBack }) => {
  return (
    <div className="flex flex-col items-center gap-4" onClick={onBack}>
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
      <div>{message}</div>
      <Button variant="destructive" onClick={onBack}>
        Cancel
      </Button>
    </div>
  );
};
