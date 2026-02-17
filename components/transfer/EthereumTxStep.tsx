import {
  ContractResponse,
  TransferStep,
  ValidationData,
  ValidationResult,
} from "@/utils/types";
import { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { LucideLoaderCircle } from "lucide-react";
import { Button } from "../ui/button";
import { etherscanTxHashLink } from "@/lib/explorerLinks";
import { formatUnits } from "ethers";

interface EthereumTxStepProps {
  title: string;
  id: number;
  step: TransferStep;
  data: ValidationData;
  plan: ValidationResult;
  currentStep: number;
  nextStep: () => Promise<unknown> | unknown;
  action: (_data: ValidationData, _amount: string) => Promise<ContractResponse>;
  errorMessage?: string;
  submitButtonText?: string;
  description?: string;
}

export function EthereumTxStep({
  title,
  id,
  data,
  plan,
  currentStep,
  nextStep,
  action,
  errorMessage,
  submitButtonText,
  description,
}: EthereumTxStepProps) {
  let defaultAmount = data.formData.amount;
  if (plan.kind === "ethereum_l2->polkadot" && plan.data.totalInputAmount) {
    defaultAmount = formatUnits(
      plan.data.totalInputAmount,
      data.tokenMetadata.decimals,
    );
  }
  const [amount, setAmount] = useState(defaultAmount);
  const [busy, setBusy] = useState(false);
  interface Message {
    text: string;
    link?: string;
  }
  const [success, setSuccess] = useState<Message>();
  const [error, setError] = useState<Message>();
  return (
    <div key={id} className="flex flex-col gap-4 justify-between">
      <div
        className={
          "flex justify-between " + (currentStep < id ? " text-zinc-400" : "")
        }
      >
        <div>
          Step {id}: {title}
        </div>
        <div className="text-sm" hidden={!success}>
          <span className="text-green-500 dark:text-green-400">
            {success?.text}
          </span>
          {success?.link ? (
            <a href={success?.link} target="_blank" rel="noopener noreferrer">
              {" "}
              (view explorer)
            </a>
          ) : (
            <span />
          )}
        </div>
      </div>
      <div
        className={
          "hidden text-sm text-muted-foreground " +
          (currentStep === id ? "md:flex" : "")
        }
      >
        {description}
      </div>
      <div
        className={
          "flex gap-2 place-items-center" +
          (currentStep !== id ? " hidden" : "")
        }
      >
        <Label className="w-1/5">Amount</Label>
        <Input
          disabled={busy}
          className="w-3/5"
          type="number"
          defaultValue={amount}
          onChange={(v) => setAmount(v.target.value)}
        />
        {busy ? (
          <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
        ) : (
          <Button
            className="w-1/5 action-button"
            size="sm"
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              try {
                const { receipt } = await action(data, amount);
                const etherscanLink = etherscanTxHashLink(
                  data.assetRegistry.environment,
                  data.source.id,
                  receipt?.hash ?? "",
                );
                if (receipt?.status === 1) {
                  setSuccess({ text: "Success", link: etherscanLink });
                  nextStep();
                } else {
                  setError({
                    text: errorMessage ?? "Error submtting tx.",
                    link: etherscanLink,
                  });
                }
              } catch (error: any) {
                console.error(error);
                setError({ text: errorMessage ?? "Error submitting tx." });
              }
              setBusy(false);
            }}
          >
            {submitButtonText ?? "Submit"}
          </Button>
        )}
      </div>
      <div className="text-red-500 dark:text-red-400 text-sm" hidden={!error}>
        {error?.text}{" "}
        {error?.link ? (
          <a href={error?.link} target="_blank" rel="noopener noreferrer">
            {" "}
            (view explorer)
          </a>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
