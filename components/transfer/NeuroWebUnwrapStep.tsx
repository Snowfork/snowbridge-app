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
import { toast } from "sonner";
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

  useEffect(() => {
    if (currentId !== messageId || messageId === undefined) {
      setCurrentId(messageId);
      setSuccess(undefined);
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
        <div className="flex place-items-center">
          <Label className="w-1/5">Amount</Label>
          <Input
            className="w-4/5"
            type="string"
            defaultValue={amount}
            disabled={busy || !ready}
            onChange={(v) => setAmount(v.target.value)}
          />
        </div>
        {balanceData?.nativeBalance === 0n && (
          <div className="text-red-500 text-sm mt-2">
            Insufficient NEURO balance to pay transaction fees. Please acquire
            NEURO on Neuroweb parachain.
          </div>
        )}
        <div className="flex gap-4 place-items-center mt-2">
          {busy ? (
            <div className="flex items-center justify-center w-full gap-2">
              <LucideLoaderCircle className="animate-spin text-secondary-foreground" />
              <span>Processing...</span>
            </div>
          ) : (
            <Button
              className="w-full"
              disabled={
                busy ||
                !ready ||
                balanceData === undefined ||
                amount === undefined ||
                parseUnits(amount ?? "0", token.decimals) <= 0n
              }
              onClick={async () => {
                if (!beneficiary) {
                  toast.error("Beneficiary Wallet is not connected.", {
                    position: "bottom-center",
                    closeButton: true,
                    duration: 5000,
                  });
                  return;
                }
                try {
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
                    toast.error("Unwrap failed.", {
                      position: "bottom-center",
                      closeButton: true,
                      duration: 10000,
                      action: {
                        label: "View Explorer",
                        onClick: () => window.open(link, "_blank"),
                      },
                    });
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

                  // Parse specific error messages for better UX
                  let errorMessage = "Error submitting unwrap.";
                  if (err && typeof err === "object" && "message" in err) {
                    const errMsg = String(err.message);
                    if (
                      errMsg
                        .toLowerCase()
                        .includes("inability to pay some fees") ||
                      errMsg.toLowerCase().includes("account balance too low")
                    ) {
                      errorMessage =
                        "Insufficient NEURO balance to pay transaction fees.";
                    } else if (errMsg.includes("Invalid Transaction")) {
                      errorMessage =
                        "Transaction failed. Please check your balance and try again.";
                    }
                  }

                  toast.error(errorMessage, {
                    position: "bottom-center",
                    closeButton: true,
                    duration: 5000,
                  });
                }
              }}
            >
              {mode == "unwrap" ? "Initialize Bridging" : "Finalize Bridging"}
            </Button>
          )}
        </div>
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
      ? 'Start your transaction by converting NeuroWeb TRAC to bridged TRAC. Click on "Initiate Bridging"'
      : 'Complete your transaction by converting bridged TRAC to NeuroWeb TRAC. Click on "Finalize Bridging".';
  return (
    <div className="flex flex-col gap-4 justify-between">
      <div className="flex justify-between">
        <div className={success ? "" : "text-2xl"}>{displayTitle}</div>
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
