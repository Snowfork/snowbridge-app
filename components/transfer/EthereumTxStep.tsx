import { ContractResponse, TransferStep, ValidationData } from "@/utils/types";
import { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { LucideLoaderCircle } from "lucide-react";
import { Button } from "../ui/button";
import { etherscanTxHashLink } from "@/lib/explorerLinks";

interface EthereumTxStepProps {
  title: string;
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  nextStep: () => Promise<unknown> | unknown;
  action: (data: ValidationData, amount: string) => Promise<ContractResponse>;
  errorMessage?: string;
  submitButtonText?: string;
  description?: string;
}

export function EthereumTxStep({
  title,
  id,
  data,
  currentStep,
  nextStep,
  action,
  errorMessage,
  submitButtonText,
  description,
}: EthereumTxStepProps) {
  const [amount, setAmount] = useState(data.formData.amount);
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
          <span className="text-green-500">{success?.text}</span>
          {success?.link ? (
            <a href={success?.link}> (view explorer)</a>
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
          defaultValue={data.formData.amount}
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
                  data.assetRegistry.ethChainId,
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
      <div className="text-red-500 text-sm" hidden={!error}>
        {error?.text}{" "}
        {error?.link ? <a href={error?.link}> (view explorer)</a> : <span />}
      </div>
    </div>
  );
}
