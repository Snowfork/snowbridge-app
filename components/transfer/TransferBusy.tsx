import { FC } from "react";
import { Button } from "../ui/button";
import { ValidationData } from "@/utils/types";
import { Loader2 } from "lucide-react";

interface TransferBusyProps {
  message?: string;
  data?: ValidationData;
  onBack?: () => Promise<unknown> | unknown;
  isSuccess?: boolean;
}
export const TransferBusy: FC<TransferBusyProps> = ({
  message,
  onBack,
  isSuccess = false,
}) => {
  return (
    <div className="flex flex-col">
      <div className="items-center flex flex-col mt-5">
        {isSuccess ? (
          <div className="w-full rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 mb-4">
            <div className="flex items-start gap-3">
              <Loader2 className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 animate-spin" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-green-800 dark:text-green-200">
                  Submitting transaction
                </span>
                <span className="text-sm text-green-700 dark:text-green-300">
                  Please sign message and wait for transaction to confirm. This
                  may take a couple of minutes.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 mb-4">
            <div className="flex items-start gap-3">
              <Loader2 className="text-slate-600 dark:text-slate-300 flex-shrink-0 mt-0.5 animate-spin" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Validating transaction
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{message}</span>
              </div>
            </div>
          </div>
        )}
        <Button
          className="mt-5 glass-button"
          variant="secondary"
          onClick={onBack}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
