import { polkadotAccountsAtom } from "@/store/polkadot";
import { atom, useAtom, useAtomValue } from "jotai";
import { useContext, useEffect, useState } from "react";
import { Label } from "../ui/label";
import { formatBalance, trimAccount } from "@/utils/formatting";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { LucideLoaderCircle } from "lucide-react";
import { formatUnits, parseUnits } from "ethers";
import { subscanExtrinsicLink } from "@/lib/explorerLinks";
import { RegistryContext } from "@/app/providers";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { AssetRegistry } from "@snowbridge/base-types";
import { isHex, u8aToHex } from "@polkadot/util";
import {
  useNeuroWebBalance,
  useNeuroWebWrapUnwrap,
} from "@/hooks/useNeuroWebWrapUnwrap";
import {
  NEURO_WEB_PARACHAIN,
  TransferStep,
  ValidationData,
} from "@/utils/types";

interface TransferStepData {
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  nextStep: () => Promise<unknown> | unknown;
  defaultAmount: string;
  messageId?: string;
}

export function NeuroWebWrapStep({
  id,
  currentStep,
  messageId,
  step,
  defaultAmount,
  data,
  nextStep,
}: TransferStepData) {
  const title = "Unwrap TRAC";
  return (
    <div key={id} className="flex flex-col gap-4 justify-between">
      <NeuroWebUnwrapForm
        defaultAmount={defaultAmount}
        beneficiaryAddress={data.formData.sourceAccount}
        mode="unwrap"
        ready={true}
        title={`Step ${id}: ${title}`}
        tokenAddress={data.formData.token}
        nextStep={nextStep}
        messageId={messageId}
      />
    </div>
  );
}

function reEncodeAddress(address: string | undefined, registry: AssetRegistry) {
  return encodeAddress(
    decodeAddress(address, false, registry.relaychain.ss58Format),
    registry.parachains[NEURO_WEB_PARACHAIN].info.ss58Format,
  );
}

interface NeurowebUnwrap {
  defaultAmount: string;
  beneficiaryAddress: string;
  title?: string;
  description?: string;
  tokenAddress: string;
  ready: boolean;
  mode: "wrap" | "unwrap";
  nextStep?: () => Promise<unknown> | unknown;
  messageId?: string;
}
interface Message {
  text: string;
  link?: string;
}

const currentMessageId = atom<string>();
const successAtom = atom<Message>();
const errorAtom = atom<Message>();
const busyAtom = atom<boolean>();

export function NeuroWebUnwrapForm({
  defaultAmount,
  beneficiaryAddress,
  tokenAddress,
  ready,
  mode,
  messageId,
  title,
  description,
  nextStep,
}: NeurowebUnwrap) {
  const assetRegistry = useContext(RegistryContext)!;

  let beneficiaryHex;
  if (!isHex(beneficiaryAddress)) {
    beneficiaryHex = u8aToHex(decodeAddress(beneficiaryAddress));
  } else {
    beneficiaryHex = beneficiaryAddress;
  }
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const beneficiary = polkadotAccounts?.find(
    (acc) =>
      u8aToHex(
        decodeAddress(acc.address, false, assetRegistry.relaychain.ss58Format),
      ).toLowerCase() === beneficiaryHex.toLowerCase(),
  );

  const { data: balanceData } = useNeuroWebBalance(beneficiary?.address);
  const { unwrap, wrap } = useNeuroWebWrapUnwrap();
  const token =
    assetRegistry.ethereumChains[assetRegistry.ethChainId].assets[
      tokenAddress.toLowerCase()
    ];

  const [amount, setAmount] = useState<string>();
  const [busy, setBusy] = useAtom(busyAtom);

  const [success, setSuccess] = useAtom(successAtom);
  const [currentId, setCurrentId] = useAtom(currentMessageId);
  const [error, setError] = useAtom(errorAtom);

  useEffect(() => {
    if (currentId !== messageId || messageId === undefined) {
      setCurrentId(messageId);
      setSuccess(undefined);
      setError(undefined);
      setBusy(undefined);
    }
    const txAmount = BigInt(defaultAmount);
    const balance = balanceData
      ? mode === "unwrap"
        ? balanceData.neuroTracBalance
        : balanceData.bridgedTracBalance
      : txAmount;
    const amount = txAmount > balance ? balance : txAmount;
    setAmount(formatUnits(amount, token.decimals));
  }, [
    messageId,
    currentId,
    setCurrentId,
    setSuccess,
    setError,
    setBusy,
    setAmount,
    balanceData,
    defaultAmount,
    mode,
    token.decimals,
  ]);

  const beneficiaryLabel = (
    <>
      <div className="flex place-items-center">
        <Label className="w-1/5">Account</Label>
        <div className="w-4/5">
          {" "}
          <div>
            {beneficiary?.name ?? ""}{" "}
            <pre className="inline lg:hidden w-full">
              (
              {trimAccount(
                reEncodeAddress(
                  beneficiary?.address ?? beneficiaryAddress,
                  assetRegistry,
                ),
                30,
              )}
              )
            </pre>
            <pre className="hidden lg:inline">
              (
              {reEncodeAddress(
                beneficiary?.address ?? beneficiaryAddress,
                assetRegistry,
              )}
              )
            </pre>
          </div>
        </div>
      </div>
      <div className="flex place-items-center">
        <Label className="w-1/5">Bridged</Label>
        <pre className="w-4/5">
          {balanceData !== undefined
            ? formatBalance({
                number: balanceData.bridgedTracBalance,
                decimals: token.decimals,
              }) + ` ${token.symbol}`
            : "Fetching..."}
        </pre>
      </div>
      <div className="flex place-items-center">
        <Label className="w-1/5">NeuroWeb</Label>
        <pre className="w-4/5">
          {balanceData !== undefined
            ? formatBalance({
                number: balanceData.neuroTracBalance,
                decimals: token.decimals,
              }) + ` ${token.symbol}`
            : "Fetching..."}
        </pre>
      </div>
    </>
  );

  const form = (
    <>
      <div
        className={
          "flex flex-col gap-1 " + (success !== undefined ? "hidden" : "")
        }
        hidden={success !== undefined}
      >
        {beneficiaryLabel}
        <div className="flex gap-4 place-items-center">
          <Label className="w-2/5">Amount</Label>
          <Input
            className="w-4/5"
            type="string"
            defaultValue={amount}
            disabled={busy || !ready}
            onChange={(v) => setAmount(v.target.value)}
          />
        </div>
        <div className="flex gap-4 place-items-center">
          {busy ? (
            <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
          ) : (
            <Button
              size="sm"
              disabled={
                busy ||
                !ready ||
                balanceData === undefined ||
                amount === undefined ||
                parseUnits(amount ?? "0", token.decimals) <= 0n
              }
              onClick={async () => {
                if (!beneficiary) {
                  setError({
                    text: "Beneficiary Wallet is not connected.",
                  });
                  return;
                }
                try {
                  setError(undefined);
                  setSuccess(undefined);
                  setBusy(true);
                  const amountInSmallestUnit = parseUnits(
                    amount ?? "0",
                    token.decimals,
                  );
                  const result =
                    mode === "unwrap"
                      ? await unwrap(
                          { polkadotAccount: beneficiary },
                          amountInSmallestUnit,
                        )
                      : await wrap(
                          { polkadotAccount: beneficiary },
                          amountInSmallestUnit,
                        );
                  setBusy(false);
                  const link = subscanExtrinsicLink(
                    assetRegistry.environment,
                    NEURO_WEB_PARACHAIN,
                    `${result.blockNumber}-${result.txIndex}`,
                  );

                  if (!result.success) {
                    console.error(result.dispatchError);
                    setError({ text: "Unwrap failed.", link });
                  } else {
                    if (nextStep) nextStep();
                    setSuccess({
                      text: "Success",
                      link,
                    });
                  }
                } catch (err) {
                  console.error(err);
                  setBusy(false);
                  setError({ text: "Error submitting unwrap." });
                }
              }}
            >
              {mode == "unwrap" ? "Initialize Bridging" : "Finalize Bridging"}
            </Button>
          )}
        </div>
      </div>
      <div className="flex text-sm place-content-end" hidden={!error}>
        <div className="text-red-500 pr-2">{error?.text}</div>
        {error?.link ? (
          <a href={error?.link} target="_blank" rel="noopener noreferrer">
            (view explorer)
          </a>
        ) : (
          <div />
        )}
      </div>
    </>
  );

  const connectWalletMsg = (
    <div className="flex flex-col gap-2">
      {beneficiaryLabel}
      <div className="text-red-500">
        Connect beneficiary account wallet in order to {mode}.
      </div>
    </div>
  );
  const displayTitle = title
    ? title
    : (mode === "unwrap" ? "Initialize Bridging" : "Finalize Bridging") +
      " TRAC " +
      (!ready ? " (Pending Transfer Complete)" : "");
  const displayDescription = description
    ? description
    : mode === "unwrap"
      ? "Convert NeuroWeb TRAC to bridged TRAC."
      : "Convert bridged TRAC to NeuroWeb TRAC.";
  return (
    <div className="flex flex-col gap-4 justify-between">
      <div className="flex justify-between">
        <div className={success ? "text-zinc-400" : ""}>{displayTitle}</div>
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
          success !== undefined
            ? "hidden"
            : "text-sm text-muted-foreground flex"
        }
      >
        {displayDescription}
      </div>
      {beneficiary !== undefined ? form : connectWalletMsg}
    </div>
  );
}
