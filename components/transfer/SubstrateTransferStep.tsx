import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import { decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { TransferStep, ValidationData } from "@/utils/types";
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
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
import { useSubstrateTransfer } from "@/hooks/useSubstrateTransfer";
import { parseUnits } from "ethers";
import { subscanExtrinsicLink } from "@/lib/explorerLinks";
import { getEnv } from "@vercel/functions";
import { getEnvironmentName } from "@/lib/snowbridge";
import { useAssetRegistry } from "@/hooks/useAssetRegistry";

interface TransferStepData {
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  title: string;
  nextStep: () => Promise<unknown> | unknown;
  description?: string;
  defaultAmount: string;
}

export function SubstrateTransferStep({
  id,
  data,
  currentStep,
  nextStep,
  title,
  description,
  defaultAmount,
}: TransferStepData) {
  const envName = getEnvironmentName();
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const { data: assetRegistry } = useAssetRegistry();

  const { transferAsset } = useSubstrateTransfer();

  const [amount, setAmount] = useState(defaultAmount);
  const [busy, setBusy] = useState(false);
  interface Message {
    text: string;
    link?: string;
  }
  const [success, setSuccess] = useState<Message>();
  const [error, setError] = useState<Message>();

  const targetInfo = useMemo(() => {
    if (data.source.type === "ethereum" && data.destination.parachain) {
      // Source is ethereum and destination is the parachain.
      return {
        paraId: data.destination.parachain.parachainId,
        account: data.formData.beneficiary,
      };
    } else if (data.destination.type === "ethereum" && data.source.parachain) {
      // Destination is ethereum and source is the parachain.
      return {
        paraId: data.source.parachain.parachainId,
        account: data.formData.sourceAccount,
      };
    } else {
      setError({
        text: "Could not infer target parachain and beneficiary.",
      });
      return null;
    }
  }, [
    data.destination.parachain,
    data.destination.type,
    data.formData.beneficiary,
    data.formData.sourceAccount,
    data.source.parachain,
    data.source.type,
  ]);
  const [account, setAccount] = useState(
    targetInfo?.account ??
      polkadotAccount?.address ??
      (polkadotAccounts !== null && polkadotAccounts.length > 1
        ? polkadotAccounts[0]
        : undefined
      )?.address,
  );
  const beneficiary = polkadotAccounts?.find(
    (acc) => acc.address === targetInfo?.account,
  );

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
          "flex flex-col gap-2" + (currentStep !== id ? " hidden" : "")
        }
      >
        <div className="flex gap-2 place-items-center">
          <Label className="w-1/5">Source Account</Label>
          <div className="w-4/5">
            <Select
              onValueChange={(v) => {
                setAccount(v);
              }}
              defaultValue={targetInfo?.account}
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
                          <pre className="inline lg:hidden">
                            ({trimAccount(acc.address)})
                          </pre>
                          <pre className="hidden lg:inline">
                            ({acc.address})
                          </pre>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-4 place-items-center">
          <Label className="flex w-1/5">Beneficiary</Label>
          <div className="flex-col text-gray-500 text-center w-4/5">
            {beneficiary?.name}{" "}
            <pre className="inline lg:hidden text-sm">
              ({trimAccount(beneficiary?.address ?? data.formData.beneficiary)})
            </pre>
            <pre className="hidden lg:inline text-sm">
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
            onChange={(v) => setAmount(v.target.value)}
          />
          {busy ? (
            <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
          ) : (
            <Button
              size="sm"
              onClick={async () => {
                if (!targetInfo) {
                  setError({
                    text: "Could not infer target parachain and beneficiary.",
                  });
                  return;
                }
                if (!account) {
                  setError({
                    text: "Could not infer signing account.",
                  });
                  return;
                }
                try {
                  setError(undefined);
                  setBusy(true);
                  const result = await transferAsset(
                    "relaychain",
                    account,
                    {
                      parents: 0,
                      interior: {
                        X1: [
                          {
                            Parachain: targetInfo.paraId,
                          },
                        ],
                      },
                    },
                    {
                      parents: 0,
                      interior: {
                        X1: [
                          {
                            AccountId32: {
                              id: u8aToHex(decodeAddress(targetInfo.account)),
                            },
                          },
                        ],
                      },
                    },
                    {
                      parents: 0,
                      interior: "Here",
                    },
                    parseUnits(amount, assetRegistry.relaychain.tokenDecimals),
                  );
                  nextStep();
                  setBusy(false);
                  const link = subscanExtrinsicLink(
                    envName,
                    "relaychain",
                    `${result.blockNumber}-${result.txIndex}`,
                  );

                  if (result.error) {
                    console.log(
                      result.error.toHuman(),
                      result.error.toString(),
                    );
                    setError({ text: "Extrinsic failed.", link });
                  } else {
                    setSuccess({
                      text: "Success",
                      link,
                    });
                  }
                } catch (err) {
                  console.error(err);
                  setBusy(false);
                  setError({ text: "Error submitting transfer." });
                }
              }}
            >
              Transfer
            </Button>
          )}
        </div>
      </div>
      <div className="text-sm" hidden={!error}>
        <span className="text-red-500 ">{error?.text}</span>
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
