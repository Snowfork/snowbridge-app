import { FC } from "react";
import { Button } from "../ui/button";
import { TransferPlanSteps, ValidationData } from "@/utils/types";
import { LucideAlertCircle } from "lucide-react";
import { forInterParachain, toEthereumV2, toPolkadotV2 } from "@snowbridge/api";

interface TransferErrorProps {
  message?: string;
  onBack?: () => Promise<unknown> | unknown;
  plan?: TransferPlanSteps;
  data?: ValidationData;
}

export function overrideMessage(
  error:
    | toEthereumV2.ValidationLog
    | toPolkadotV2.ValidationLog
    | forInterParachain.ValidationLog,
  data?: ValidationData,
) {
  switch (data?.source.id) {
    case "ethereum": {
      const e = error as toPolkadotV2.ValidationLog;
      if (e.reason == toPolkadotV2.ValidationReason.InsufficientEther) {
        return "Insufficient ETH balance to pay transfer fees.";
      }
      break;
    }
  }
  return error.message;
}

export const TransferError: FC<TransferErrorProps> = ({
  message,
  onBack,
  plan,
  data,
}) => {
  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <div className="w-full rounded-xl bg-red-50 border border-red-200 p-4">
        <div className="flex items-start gap-3">
          <LucideAlertCircle className="text-red-800 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-red-800">Transfer blocked</span>
            <span className="text-sm text-red-700">{message}</span>
            {(plan?.errors ?? []).length > 0 && (
              <div className="mt-2">
                {(plan?.errors ?? []).map((e, i) => (
                  <div key={i} className="mt-1">
                    <span className="font-medium text-red-800">
                      {overrideMessage(e, data)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <Button variant="glass" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};
