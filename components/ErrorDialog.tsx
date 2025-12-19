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
      <DialogContent className={"glass more-blur"}>
        <DialogHeader>
          <DialogTitle>{title ?? "Error"}</DialogTitle>
          <DialogDescription className="flex items-start py-2 overflow-hidden">
            <LucideAlertCircle className="mx-2 mt-0.5 flex-shrink-0 text-destructive" />
            <span className="break-words overflow-y-auto max-h-60 min-w-0">
              {description}
            </span>
          </DialogDescription>
          {children}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
