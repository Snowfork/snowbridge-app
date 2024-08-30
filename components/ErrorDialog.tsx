import { FC, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { LucideAlertCircle } from "lucide-react";

type ErrorProps = {
  title?: string;
  description: string;
  open: boolean;
  dismiss?: () => void;
  children?: ReactNode;
};

export const ErrorDialog: FC<ErrorProps> = ({
  title,
  description,
  open,
  dismiss,
  children,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(a) => {
        if (!a && dismiss) dismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? "Error"}</DialogTitle>
          <DialogDescription className="flex items-center py-2">
            <LucideAlertCircle className="mx-2 text-destructive" />
            {description}
          </DialogDescription>
          {children}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
