import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import { TransferStep, ValidationData } from "@/utils/types";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { trimAccount } from "@/utils/formatting";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { LucideLoaderCircle } from "lucide-react";

interface TransferStepData {
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  title: string;
  nextStep: () => Promise<unknown> | unknown;
  description?: string;
  amount: string;
}

export function SubstrateTransferStep({
  id,
  data,
  currentStep,
  nextStep,
  title,
  description,
  amount,
}: TransferStepData) {
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [account, setAccount] = useState(
    data.formData.beneficiary ??
      polkadotAccount?.address ??
      (polkadotAccounts !== null && polkadotAccounts.length > 1
        ? polkadotAccounts[0]
        : undefined
      )?.address,
  );
  const beneficiary = polkadotAccounts?.find(
    (acc) => acc.address === data.formData.beneficiary,
  );
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
          "flex flex-col gap-2" + (currentStep !== id ? " hidden" : "")
        }
      >
        <div className="flex gap-2 place-items-center">
          <Label className="w-1/5">Source Account</Label>
          <Select
            onValueChange={(v) => {
              setAccount(v);
            }}
            value={account}
            disabled={busy}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {polkadotAccounts?.map((acc) => {
                  return (
                    <SelectItem key={acc.address} value={acc.address}>
                      <div>
                        {acc.name}{" "}
                        <pre className="inline md:hidden">
                          ({trimAccount(acc.address)})
                        </pre>
                        <pre className="hidden md:inline">({acc.address})</pre>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4 place-items-center">
          <Label className="w-1/5">Beneficiary</Label>
          <div className="text-gray-500 text-center">
            {beneficiary?.name}{" "}
            <pre className="inline md:hidden">
              ({trimAccount(beneficiary?.address ?? data.formData.beneficiary)})
            </pre>
            <pre className="hidden md:inline">
              ({beneficiary?.address ?? data.formData.beneficiary})
            </pre>
          </div>
        </div>
        <div className="flex gap-4 place-items-center">
          <Label className="w-1/5">Amount</Label>
          <Input
            className="w-full"
            type="string"
            defaultValue={amount}
            disabled={busy}
          />
          {busy ? (
            <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
          ) : (
            <Button
              size="sm"
              onClick={() => {
                try {
                  setError(undefined);
                  setBusy(true);
                  nextStep();
                  setSuccess({ text: "Success" });
                } catch (err) {
                  setError({ text: "Error submitting transfer." });
                  setBusy(false);
                }
              }}
            >
              Transfer
            </Button>
          )}
        </div>
      </div>
      <div className="text-red-500 text-sm" hidden={!error}>
        {error?.text}{" "}
        {error?.link ? <a href={error?.link}> (view explorer)</a> : <span />}
      </div>
    </div>
  );
}
