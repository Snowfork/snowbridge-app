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
      <div className="flex">
        <LucideAlertCircle className="mx-2 text-destructive" />
        {message}
      </div>
      <ol
        hidden={!data && !plan?.errors}
        className="flex-col list-inside list-disc"
      >
        {(plan?.errors ?? []).map((e, i) => (
          <li key={i} className="p-1">
            {overrideMessage(e, data)}
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-center gap-4">
        <Button variant="default" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};
