import { FC } from "react";
import { Button } from "../ui/button";
import { TransferPlanSteps, ValidationData } from "@/utils/types";
import { LucideAlertCircle } from "lucide-react";
import { toEthereum, toPolkadot } from "@snowbridge/api";

interface TransferErrorProps {
  message?: string;
  onBack?: () => Promise<unknown> | unknown;
  plan?: TransferPlanSteps;
  data?: ValidationData;
}

export function overrideMessage(
  error: toEthereum.SendValidationError | toPolkadot.SendValidationError,
  data?: ValidationData,
) {
  if (
    data?.source.id === "ethereum" &&
    error.code === toPolkadot.SendValidationCode.InsufficientFee
  ) {
    return "Insufficient ETH balance to pay transfer fees.";
  }
  return (error as any).message ?? "";
}

export const TransferError: FC<TransferErrorProps> = ({
  message,
  onBack,
  plan,
  data,
}) => {
  return (
    <div className="flex flex-col items-center gap-4">
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
        <Button variant="destructive" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};
