import { FC, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { LucideLoaderCircle } from "lucide-react";

type BusyDialogProps = {
  title?: string;
  open: boolean;
  description: string;
  dismiss?: () => void;
  children?: ReactNode;
};

export const BusyDialog: FC<BusyDialogProps> = ({
  open,
  title,
  description,
  dismiss,
  children,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(a) => {
        if (!a && dismiss) {
          dismiss();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? "Busy"}</DialogTitle>
          <DialogDescription className="flex items-center py-2">
            <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
            {description}
          </DialogDescription>
          {children}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
