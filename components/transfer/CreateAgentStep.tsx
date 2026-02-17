import { ContractResponse, TransferStep, ValidationData } from "@/utils/types";
import { useState } from "react";
import { LucideLoaderCircle } from "lucide-react";
import { Button } from "../ui/button";
import { etherscanTxHashLink } from "@/lib/explorerLinks";
import { chainName } from "@/utils/chainNames";
import { encodeAddress } from "@polkadot/util-crypto";
import { Label } from "../ui/label";

interface CreateAgentStepProps {
  title: string;
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  nextStep: () => Promise<unknown> | unknown;
  action: (_data: ValidationData) => Promise<ContractResponse>;
  errorMessage?: string;
  submitButtonText?: string;
  description?: string;
}

export function CreateAgentStep({
  title,
  id,
  data,
  currentStep,
  nextStep,
  action,
  errorMessage,
  submitButtonText,
  description,
}: CreateAgentStepProps) {
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
          "grid grid-cols-[max-content_1fr] items-center gap-2 " +
          (currentStep !== id ? " hidden" : "")
        }
      >
        <Label>Chain</Label>
        <div className="text-sm">{chainName(data.source)}</div>
        <Label>Account</Label>
        <div className="text-sm">
          {encodeAddress(
            data.formData.sourceAccount,
            data.source.parachain?.info.ss58Format ??
              data.assetRegistry.relaychain.ss58Format,
          )}
        </div>
      </div>
      <div className="flex justify-end">
        {busy ? (
          <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground w-1/5" />
        ) : (
          <Button
            className="w-1/5 action-button"
            size="sm"
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              try {
                const { receipt } = await action(data);
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
