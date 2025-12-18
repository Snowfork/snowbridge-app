import { polkadotAccountsAtom } from "@/store/polkadot";
import { atom, useAtom, useAtomValue } from "jotai";
import { useContext, useEffect, useState } from "react";
import { Label } from "../ui/label";
import { formatBalance, trimAccount } from "@/utils/formatting";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { LucideInfo, LucideLoaderCircle } from "lucide-react";
import { ImageWithFallback } from "../ui/image-with-fallback";
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
    <div className="glass-sub p-4 space-y-3">
      <div className="flex items-center gap-3">
        <ImageWithFallback
          className="flex-shrink-0 rounded-full"
          src="/images/origintrail-parachain.png"
          fallbackSrc="/images/parachain_generic.png"
          width={32}
          height={32}
          alt="NeuroWeb"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-sm truncate">
            {beneficiary?.name ?? "Account"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {trimAccount(
              reEncodeAddress(
                beneficiary?.address ?? beneficiaryAddress,
                assetRegistry,
              ),
              24,
            )}
          </span>
        </div>
      </div>
      <div className="border-t border-white/20 pt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-glass">Bridged TRAC</span>
          <span className="font-medium">
            {balanceData !== undefined
              ? formatBalance({
                  number: balanceData.bridgedTracBalance,
                  decimals: token.decimals,
                }) + ` ${token.symbol}`
              : "Fetching..."}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-glass">NeuroWeb TRAC</span>
          <span className="font-medium">
            {balanceData !== undefined
              ? formatBalance({
                  number: balanceData.neuroTracBalance,
                  decimals: token.decimals,
                }) + ` ${token.symbol}`
              : "Fetching..."}
          </span>
        </div>
      </div>
    </div>
  );

  const form = (
    <>
      <div
        className={
          "flex flex-col gap-4 " + (success !== undefined ? "hidden" : "")
        }
        hidden={success !== undefined}
      >
        {beneficiaryLabel}
        <div className="space-y-2">
          <Label>Amount</Label>
          <div className="amountContainer flex items-center gap-2 w-full px-3 py-3">
            <input
              className="amountInput flex-1 text-left text-2xl font-medium bg-transparent border-0 outline-none placeholder:text-muted-foreground"
              type="string"
              placeholder="0.0"
              value={amount}
              disabled={busy || !ready}
              onChange={(v) => setAmount(v.target.value)}
            />
            <span className="text-sm text-muted-foreground flex-shrink-0">
              {token.symbol}
            </span>
          </div>
        </div>
        {balanceData?.nativeBalance === 0n && (
          <div className="w-full rounded-xl bg-red-50 border border-red-200 p-3">
            <div className="flex items-start gap-2">
              <LucideInfo className="text-red-600 flex-shrink-0 mt-0.5 w-4 h-4" />
              <span className="text-sm text-red-700">
                Insufficient NEURO balance to pay transaction fees. Please
                acquire NEURO on NeuroWeb parachain.
              </span>
            </div>
          </div>
        )}
        <div className="flex gap-4 place-items-center">
          {busy ? (
            <div className="flex items-center justify-center w-full gap-2 py-3">
              <LucideLoaderCircle className="animate-spin text-secondary-foreground" />
              <span>Processing...</span>
            </div>
          ) : (
            <Button
              className="w-full action-button"
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
        <div className={success ? "" : "text-xl font-semibold leading-none tracking-tight"}>{displayTitle}</div>
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
            : "w-full rounded-xl bg-yellow-100/40 border border-yellow-200/60 backdrop-blur-sm p-4"
        }
      >
        <div className="flex items-start gap-3">
          <LucideInfo className="text-yellow-600/80 flex-shrink-0 mt-0.5 w-5 h-5" />
          <span className="text-sm text-yellow-800/70">{displayDescription}</span>
        </div>
      </div>
      {beneficiary !== undefined ? form : connectWalletMsg}
    </div>
  );
}
