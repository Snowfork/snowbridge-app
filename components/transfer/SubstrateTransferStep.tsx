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

interface TransferStepData {
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  title: string;
  nextStep: () => Promise<unknown> | unknown;
}

export function SubstrateTransferStep({
  id,
  data,
  currentStep,
  nextStep,
  title,
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
  return (
    <div key={id} className="flex flex-col gap-2 justify-between">
      <div className={currentStep < id ? " text-zinc-400" : ""}>
        Step {id}: {title}
      </div>
      <div
        className={
          "flex flex-col gap-2" + (currentStep !== id ? " hidden" : "")
        }
      >
        <div className="flex gap-2 place-items-center">
          <Label>Source Account</Label>
          <Select
            onValueChange={(v) => {
              setAccount(v);
            }}
            value={account}
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
        <div className="flex gap-2 place-items-center">
          <Label>Beneficiary</Label>
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
        <div className="flex gap-2 place-items-center">
          <Label>Amount</Label>
          <Input className="w-1/4" type="string" defaultValue="0.1" />
          <Button size="sm" onClick={nextStep}>
            Transfer
          </Button>
        </div>
      </div>
    </div>
  );
}
