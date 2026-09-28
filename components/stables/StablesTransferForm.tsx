"use client";

import {
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import base64url from "base64url";
import { formatUnits, parseUnits } from "ethers";
import { isHex, u8aToHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import {
  historyV2,
  stables,
  toEthereumV2,
  type VolumeFeeParams,
} from "@snowbridge/api";
import { serviceFeeRecipientFromEnv } from "@/hooks/useBridgeFeeInfo";
import { fetchTokenPrices } from "@/utils/tokenPrices";
import { BridgeInfoContext } from "@/app/providers";
import { snowbridgeApiAtom } from "@/store/snowbridge";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  walletAtom,
} from "@/store/polkadot";
import { transfersPendingLocalAtom } from "@/store/transferActivity";
import { useTransferActivity } from "@/hooks/useTransferActivity";
import { BusyDialog } from "@/components/BusyDialog";
import { ErrorDialog } from "@/components/ErrorDialog";
import Image from "next/image";
import { SelectAccount } from "@/components/SelectAccount";
import { PolkadotAccountDialog } from "@/components/PolkadotAccountDialog";
import { ConnectPolkadotWalletButton } from "@/components/ConnectPolkadotWalletButton";
import { filterByAccountType } from "@/utils/formSchema";
import { AccountInfo } from "@/utils/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  TokenOption,
  TokenOptionList,
  TokenPill,
} from "@/components/TokenSelector";
import {
  LucideCircleCheck,
  LucideInfo,
  LucideLoaderCircle,
  LucideTriangleAlert,
  LucideX,
} from "lucide-react";
import { formatBalance, trimAccount } from "@/utils/formatting";
import { subscanExtrinsicLink } from "@/lib/explorerLinks";
import { errorMessage } from "@/utils/errorMessage";

const DOT_DECIMALS = 10;
const HDX_DECIMALS = 12;
const SOURCE_SYMBOLS = Object.keys(
  stables.HYDRATION_STABLES,
) as stables.HydrationStableSymbol[];
const TARGET_SYMBOLS = Object.keys(
  stables.ETHEREUM_STABLES,
) as stables.EthereumStableSymbol[];

const HYDRATION_HDX_ID = 0;
const HYDRATION_DOT_ID = 5;
// Headroom for the step 2 tx fee when suggesting a DOT top-up.
const STEP2_TX_FEE_BUFFER = 200_000_000n;
const roundUpToTenthDot = (planck: bigint) =>
  ((planck + 999_999_999n) / 1_000_000_000n) * 1_000_000_000n;
const DELIVERY_POLL_MS = 6_000;
const BALANCE_REFRESH_MS = 15_000;
const DELIVERY_TIMEOUT_MS = 180_000;

const STATUS_STYLE = {
  pending:
    "bg-gray-50 border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100",
  received:
    "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100",
  timeout:
    "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100",
};

// Volume fee inputs. No recipient or no DOT/ETH price means no fee, as on /send.
async function volumeFeeInputs(
  symbol: string,
  amount: bigint,
  decimals: number,
) {
  const recipient = serviceFeeRecipientFromEnv();
  if (!recipient) return undefined;
  const prices = await fetchTokenPrices([symbol, "DOT", "ETH"]);
  // The stables are dollar pegged; use $1 when the indexer has no price.
  const stableUsd = prices[symbol.toUpperCase()] ?? 1;
  const txValueUsd = BigInt(
    Math.max(0, Math.floor(Number(formatUnits(amount, decimals)) * stableUsd)),
  );
  if (txValueUsd === 0n) return undefined;
  return {
    recipient,
    txValueUsd,
    dotUsd: prices["DOT"],
    ethUsd: prices["ETH"],
  };
}

const toCents = (usd: number) => BigInt(Math.round(usd * 100));

async function leg1VolumeFee(
  symbol: stables.HydrationStableSymbol,
  amount: bigint,
): Promise<stables.MoveToHydrationFeeParams | undefined> {
  const inputs = await volumeFeeInputs(
    symbol,
    amount,
    stables.HYDRATION_STABLES[symbol].decimals,
  );
  if (!inputs?.dotUsd) return undefined;
  return {
    txValueUsd: inputs.txValueUsd,
    dotToUsdNumerator: toCents(inputs.dotUsd),
    dotToUsdDenominator: 100n,
    serviceFeeRecipient: inputs.recipient,
  };
}

async function leg2VolumeFee(
  symbol: stables.HydrationStableSymbol,
  amount: bigint,
): Promise<VolumeFeeParams | undefined> {
  const inputs = await volumeFeeInputs(
    symbol,
    amount,
    stables.HYDRATION_STABLES[symbol].decimals,
  );
  if (!inputs?.ethUsd) return undefined;
  return {
    txValueUsd: inputs.txValueUsd,
    ethToUsdNumerator: toCents(inputs.ethUsd),
    ethToUsdDenominator: 100n,
    serviceFeeRecipient: inputs.recipient,
  };
}

type Busy = { title: string; message: string } | null;

type PendingLeg1 = {
  account: string;
  symbol: stables.HydrationStableSymbol;
  amount: bigint;
  dotTopUp: bigint;
  // Delivery is detected on the stable, or on DOT for a DOT-only top-up.
  tracks: "stable" | "dot";
  hydrationBefore: bigint;
  receipt: stables.SubmitReceipt;
  deadline: number;
  status: "pending" | "received" | "timeout";
  received?: bigint;
};

function toHex(address: string): string {
  return isHex(address) ? address : u8aToHex(decodeAddress(address));
}

function parseAmount(value: string, decimals: number): bigint | null {
  try {
    const parsed = parseUnits(
      value.trim() === "" ? "0" : value.trim(),
      decimals,
    );
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

// RPC calls fail transiently while a chain connection reconnects; retry before
// surfacing anything.
async function withRetry<T>(
  fn: () => Promise<T>,
  isCancelled: () => boolean,
  attempts = 3,
): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts || isCancelled()) throw err;
      console.warn(`Retrying after RPC error (attempt ${i}):`, err);
      await new Promise((r) => setTimeout(r, 2_000 * i));
    }
  }
}

// Raw RPC errors (wasm traps, undefined api sections) are not useful to users.
function networkError(err: unknown): string {
  console.error("Network error:", err);
  return "Could not reach the network to check this. Try again in a moment.";
}

function errorMessages(logs: toEthereumV2.ValidationLog[]): string[] {
  const errors = logs
    .filter((l) => l.kind === toEthereumV2.ValidationKind.Error)
    .map((l) => l.message);
  // A failed dry run is usually the consequence of a more specific error.
  const specific = errors.filter((e) => !e.startsWith("Dry run on"));
  return specific.length > 0 ? specific : errors;
}

// One place for everything that blocks or delays the action button.
const StatusAlert: FC<{
  errors: string[];
  info?: string | null;
  busy?: boolean;
}> = ({ errors, info, busy }) => {
  if (errors.length > 0) {
    return (
      <div className="w-full rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
          <LucideTriangleAlert className="flex-shrink-0 mt-0.5 w-4 h-4" />
          {errors.length === 1 ? (
            <span>{errors[0]}</span>
          ) : (
            <ul className="space-y-1 list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }
  if (!info) return null;
  return (
    <div className="w-full rounded-xl glass-sub px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
      {busy ? (
        <LucideLoaderCircle className="w-4 h-4 animate-spin flex-shrink-0" />
      ) : (
        <LucideInfo className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{info}</span>
    </div>
  );
};

function describeLogs(
  logs: toEthereumV2.ValidationLog[],
  data: Record<string, unknown>,
): string {
  const errors = logs
    .filter((l) => l.kind === toEthereumV2.ValidationKind.Error)
    .map((l) => l.message);
  const details = Object.entries(data)
    .filter(
      ([k, v]) => k.endsWith("DryRunError") && v !== undefined && v !== null,
    )
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  return [...errors, ...details].join("\n");
}

const StableTokenSelector: FC<{
  value: string;
  onChange: (v: string) => void;
  options: TokenOption[];
}> = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TokenPill symbol={value} />
      </DialogTrigger>
      <DialogContent className="glass more-blur">
        <TokenOptionList
          options={options}
          onSelect={(key) => {
            onChange(key);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export const StablesTransferForm: FC = () => {
  const api = useAtomValue(snowbridgeApiAtom);
  const { registry } = useContext(BridgeInfoContext)!;
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const selectedPolkadotAccount = useAtomValue(polkadotAccountAtom);
  const { account: ethereumAccount, accounts: ethereumAccounts } =
    useConnectEthereumWallet();
  const polkadotWallet = useAtomValue(walletAtom);
  const beneficiaries = useMemo<AccountInfo[]>(
    () => ethereumAccounts.map((a) => ({ key: a, name: a, type: "ethereum" })),
    [ethereumAccounts],
  );
  const addPendingTransaction = useSetAtom(transfersPendingLocalAtom);
  const { mutate: refreshHistory } = useTransferActivity();
  const router = useRouter();

  const transfer = useMemo(() => (api ? api.stables() : null), [api]);

  const [sourceAddress, setSourceAddress] = useState<string | undefined>(
    selectedPolkadotAccount?.address,
  );
  useEffect(() => {
    if (!sourceAddress && selectedPolkadotAccount) {
      setSourceAddress(selectedPolkadotAccount.address);
    }
  }, [selectedPolkadotAccount, sourceAddress]);
  const account = polkadotAccounts?.find((a) => a.address === sourceAddress);

  const [balances, setBalances] = useState<stables.StableBalances | null>(null);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  // Drop stale responses, e.g. from a previous account.
  const balancesRequest = useRef(0);
  const loadBalances = useCallback(async () => {
    if (!transfer || !sourceAddress) return null;
    const id = ++balancesRequest.current;
    try {
      const result = await transfer.balances(sourceAddress);
      if (id !== balancesRequest.current) return null;
      setBalances(result);
      setBalancesError(null);
      return result;
    } catch (err) {
      console.error("Could not load balances:", err);
      if (id === balancesRequest.current)
        setBalancesError("Could not load balances. Retrying...");
      return null;
    }
  }, [transfer, sourceAddress]);
  useEffect(() => {
    setBalances(null);
    setBalancesError(null);
    loadBalances();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadBalances();
    }, BALANCE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadBalances]);

  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const [leg1Symbol, setLeg1Symbol] =
    useState<stables.HydrationStableSymbol>("HOLLAR");
  const leg1Stable = stables.HYDRATION_STABLES[leg1Symbol];
  const [leg1Amount, setLeg1Amount] = useState("");
  const [pendingLeg1, setPendingLeg1] = useState<PendingLeg1 | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [topUpEnabled, setTopUpEnabled] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  // Once the user edits the top-up, stop replacing it with the suggestion.
  const topUpEdited = useRef(false);
  const dotTopUp = topUpEnabled
    ? (parseAmount(topUpAmount, DOT_DECIMALS) ?? 0n)
    : 0n;
  // Prefill with the balance once per account and token, never after the user clears it.
  const leg1Prefilled = useRef<string | null>(null);
  useEffect(() => {
    const key = `${sourceAddress}|${leg1Symbol}`;
    if (!balances || leg1Prefilled.current === key) return;
    leg1Prefilled.current = key;
    if (leg1Amount === "" && balances.assetHub[leg1Symbol] > 0n) {
      setLeg1Amount(
        formatUnits(balances.assetHub[leg1Symbol], leg1Stable.decimals),
      );
    }
  }, [balances, sourceAddress, leg1Amount, leg1Symbol, leg1Stable.decimals]);

  const [leg2Symbol, setLeg2Symbol] =
    useState<stables.HydrationStableSymbol>("HOLLAR");
  const leg2Stable = stables.HYDRATION_STABLES[leg2Symbol];
  const [leg2Amount, setLeg2Amount] = useState("");
  const [target, setTarget] = useState<stables.EthereumStableSymbol>("USDT");
  const [beneficiary, setBeneficiary] = useState(ethereumAccount ?? "");
  const [slippage, setSlippage] = useState("0.5");
  const [accelerated, setAccelerated] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  useEffect(() => {
    if (!beneficiary && ethereumAccount) setBeneficiary(ethereumAccount);
  }, [ethereumAccount, beneficiary]);
  const leg1InFlight = pendingLeg1?.status === "pending";
  const leg2Prefilled = useRef<string | null>(null);
  useEffect(() => {
    const key = `${sourceAddress}|${leg2Symbol}`;
    if (leg1InFlight || !balances || leg2Prefilled.current === key) return;
    leg2Prefilled.current = key;
    if (leg2Amount === "" && balances.hydration[leg2Symbol] > 0n) {
      setLeg2Amount(
        formatUnits(balances.hydration[leg2Symbol], leg2Stable.decimals),
      );
    }
  }, [
    leg1InFlight,
    balances,
    sourceAddress,
    leg2Amount,
    leg2Symbol,
    leg2Stable.decimals,
  ]);

  // Poll until leg 1 lands, then fill step 2 with the amount received.
  useEffect(() => {
    if (!pendingLeg1 || pendingLeg1.status !== "pending") return;
    if (pendingLeg1.account !== sourceAddress) return;
    const poll = async () => {
      const latest = await loadBalances();
      const now =
        pendingLeg1.tracks === "dot"
          ? latest?.hydrationDot
          : latest?.hydration[pendingLeg1.symbol];
      if (now !== undefined && now > pendingLeg1.hydrationBefore) {
        const received = now - pendingLeg1.hydrationBefore;
        setPendingLeg1({ ...pendingLeg1, status: "received", received });
        if (
          pendingLeg1.tracks === "stable" &&
          leg2Symbol === pendingLeg1.symbol
        ) {
          const amount = formatUnits(
            received,
            stables.HYDRATION_STABLES[pendingLeg1.symbol].decimals,
          );
          setLeg2Amount((prev) => (prev === "" ? amount : prev));
        }
      } else if (Date.now() > pendingLeg1.deadline) {
        setPendingLeg1({ ...pendingLeg1, status: "timeout" });
      }
    };
    const timer = setInterval(poll, DELIVERY_POLL_MS);
    return () => clearInterval(timer);
  }, [pendingLeg1, sourceAddress, loadBalances, leg2Symbol]);

  const leg2AmountParsed = parseAmount(leg2Amount, leg2Stable.decimals);
  // A quote is only valid for the inputs it was fetched for.
  const quoteKey =
    sourceAddress && leg2AmountParsed
      ? `${sourceAddress}|${leg2Symbol}|${target}|${leg2AmountParsed}|${accelerated}`
      : null;
  const [quoted, setQuoted] = useState<{
    key: string;
    quote: stables.SwapQuote;
    fee: toEthereumV2.DeliveryFee;
  } | null>(null);
  const quote = quoted && quoted.key === quoteKey ? quoted.quote : null;
  const fee = quoted && quoted.key === quoteKey ? quoted.fee : null;
  useEffect(() => {
    setQuoted(null);
    setQuoteError(null);
    if (!transfer || !sourceAddress || !leg2AmountParsed || !quoteKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [q, f] = await withRetry(
          () =>
            Promise.all([
              transfer.quote(
                sourceAddress,
                leg2Symbol,
                target,
                leg2AmountParsed,
              ),
              leg2VolumeFee(leg2Symbol, leg2AmountParsed).then((volumeFee) =>
                transfer.swapAndBridgeFee(target, { accelerated, volumeFee }),
              ),
            ]),
          () => cancelled,
        );
        if (cancelled) return;
        setQuoted({ key: quoteKey, quote: q, fee: f });
      } catch (err) {
        if (cancelled) return;
        setQuoteError(networkError(err));
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    transfer,
    sourceAddress,
    leg2AmountParsed,
    leg2Symbol,
    target,
    quoteKey,
    accelerated,
  ]);

  const slippageBps = useMemo(() => {
    const n = Number(slippage);
    if (!Number.isFinite(n) || n < 0 || n > 50) return null;
    return BigInt(Math.round(n * 100));
  }, [slippage]);
  const minReceived =
    quote && slippageBps !== null
      ? quote.amountOut - (quote.amountOut * slippageBps) / 10_000n
      : null;
  const dotFee = fee?.totals.find((t) => t.symbol === "DOT")?.amount ?? null;
  const leg2ServiceFee =
    fee?.breakdown.serviceFee?.find((t) => t.symbol === "DOT")?.amount ?? 0n;

  const leg1AmountParsed = parseAmount(leg1Amount, leg1Stable.decimals);
  // The fee shown is the fee charged: submit reuses these params.
  const leg1FeeKey = leg1AmountParsed
    ? `${leg1Symbol}|${leg1AmountParsed}`
    : null;
  const [leg1Fee, setLeg1Fee] = useState<{
    key: string;
    params?: stables.MoveToHydrationFeeParams;
    amount: bigint;
  } | null>(null);
  // The service fee is on the stable; a DOT-only top-up has none.
  const leg1ServiceFee = !leg1AmountParsed
    ? 0n
    : leg1Fee && leg1Fee.key === leg1FeeKey
      ? leg1Fee.amount
      : null;
  useEffect(() => {
    if (!transfer || !leg1AmountParsed || !leg1FeeKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { params, serviceFee } = await withRetry(
          async () => {
            const params = await leg1VolumeFee(leg1Symbol, leg1AmountParsed);
            return {
              params,
              serviceFee: await transfer.moveToHydrationServiceFee(params),
            };
          },
          () => cancelled,
        );
        if (!cancelled)
          setLeg1Fee({
            key: leg1FeeKey,
            params,
            amount: serviceFee?.amount ?? 0n,
          });
      } catch (err) {
        console.error("Could not compute the service fee:", err);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [transfer, leg1Symbol, leg1AmountParsed, leg1FeeKey]);

  // Fee estimate and validation, re-run when the inputs or relevant balances change.
  const leg1CheckKey =
    sourceAddress &&
    (leg1AmountParsed || dotTopUp > 0n) &&
    leg1ServiceFee !== null &&
    balances
      ? `${sourceAddress}|${leg1Symbol}|${leg1AmountParsed ?? 0n}|${dotTopUp}|${leg1ServiceFee}|${balances.assetHub[leg1Symbol]}|${balances.assetHubDot}|${balances.hydrationDot}`
      : null;
  const [leg1Check, setLeg1Check] = useState<{
    key: string;
    fees: stables.MoveToHydrationFees;
    errors: string[];
  } | null>(null);
  const leg1Checked =
    leg1Check && leg1Check.key === leg1CheckKey ? leg1Check : null;
  const leg1NetworkFees = leg1Checked?.fees ?? null;
  const leg1HydrationFeeText =
    [
      ...(leg1NetworkFees?.hydrationExecution !== undefined
        ? [
            `${formatBalance({ number: leg1NetworkFees.hydrationExecution, decimals: leg1Stable.decimals, displayDecimals: 6 })} ${leg1Symbol}`,
          ]
        : []),
      ...(leg1NetworkFees?.hydrationDotExecution !== undefined
        ? [
            `${formatBalance({ number: leg1NetworkFees.hydrationDotExecution, decimals: DOT_DECIMALS, displayDecimals: 6 })} DOT`,
          ]
        : []),
    ].join(" + ") || null;
  const leg1AssetHubFee = leg1NetworkFees
    ? leg1NetworkFees.assetHubExecution +
      (leg1NetworkFees.assetHubDelivery ?? 0n)
    : 0n;
  useEffect(() => {
    if (!transfer || !sourceAddress || !leg1CheckKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [fees, validated] = await withRetry(
          async () => {
            const tx = await transfer.moveToHydrationTx(
              sourceAddress,
              leg1Symbol,
              leg1AmountParsed ?? 0n,
              {
                volumeFee: leg1AmountParsed ? leg1Fee?.params : undefined,
                dotTopUp,
              },
            );
            return Promise.all([
              transfer.moveToHydrationFees(tx),
              transfer.validateMoveToHydration(tx),
            ]);
          },
          () => cancelled,
        );
        if (!cancelled)
          setLeg1Check({
            key: leg1CheckKey,
            fees,
            errors: errorMessages(validated.logs),
          });
      } catch (err) {
        if (!cancelled)
          setLeg1Check({
            key: leg1CheckKey,
            fees: { assetHubExecution: 0n },
            errors: [networkError(err)],
          });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    transfer,
    sourceAddress,
    leg1Symbol,
    leg1AmountParsed,
    dotTopUp,
    leg1CheckKey,
    leg1Fee?.params,
  ]);

  // Suggest enough DOT on Hydration for step 2, with 25% headroom for gas moves.
  const [step2DotNeeds, setStep2DotNeeds] = useState<{
    normal: bigint;
    accelerated: bigint;
  } | null>(null);
  const step2DotNeed = step2DotNeeds
    ? accelerated
      ? step2DotNeeds.accelerated
      : step2DotNeeds.normal
    : null;
  const [step2Estimating, setStep2Estimating] = useState(false);
  useEffect(() => {
    if (!transfer || !topUpEnabled) return;
    let cancelled = false;
    setStep2Estimating(true);
    const timer = setTimeout(async () => {
      try {
        const volumeFee = leg1AmountParsed
          ? await leg2VolumeFee(leg1Symbol, leg1AmountParsed)
          : undefined;
        // Both modes, so switching delivery updates the suggestion without a refetch.
        const [normal, fast] = await withRetry(
          () =>
            Promise.all([
              transfer.swapAndBridgeFee(target, { volumeFee }),
              transfer.swapAndBridgeFee(target, {
                accelerated: true,
                volumeFee,
              }),
            ]),
          () => cancelled,
        );
        const dot = (f: toEthereumV2.DeliveryFee) =>
          (f.totals.find((t) => t.symbol === "DOT")?.amount ?? 0n) +
          STEP2_TX_FEE_BUFFER;
        if (!cancelled)
          setStep2DotNeeds({ normal: dot(normal), accelerated: dot(fast) });
      } catch (err) {
        console.error("Could not estimate the step 2 fees:", err);
      } finally {
        if (!cancelled) setStep2Estimating(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [transfer, topUpEnabled, leg1Symbol, leg1AmountParsed, target]);
  const suggestedTopUp =
    step2DotNeed !== null && balances
      ? (() => {
          const short = (step2DotNeed * 125n) / 100n - balances.hydrationDot;
          return short > 0n ? roundUpToTenthDot(short) : 0n;
        })()
      : null;
  useEffect(() => {
    if (suggestedTopUp !== null && !topUpEdited.current) {
      setTopUpAmount(formatUnits(suggestedTopUp, DOT_DECIMALS));
    }
  }, [suggestedTopUp]);

  const submitLeg1 = async () => {
    if (!transfer || !account) return;
    const amount = parseAmount(leg1Amount, leg1Stable.decimals) ?? 0n;
    if (amount === 0n && dotTopUp === 0n) {
      setError(`Enter a ${leg1Symbol} amount or DOT to send.`);
      return;
    }
    if (
      amount > 0n &&
      (!leg1Fee || leg1Fee.key !== `${leg1Symbol}|${amount}`)
    ) {
      setError("The service fee is still loading. Try again in a moment.");
      return;
    }
    try {
      setBusy({
        title: "Send to Hydration",
        message: "Dry running on Asset Hub and Hydration...",
      });
      const tx = await transfer.moveToHydrationTx(
        account.address,
        leg1Symbol,
        amount,
        {
          volumeFee: amount > 0n ? leg1Fee?.params : undefined,
          dotTopUp,
        },
      );
      const validated = await transfer.validateMoveToHydration(tx);
      if (!validated.success) {
        setBusy(null);
        setError(describeLogs(validated.logs, validated.data));
        return;
      }
      const tracks = amount > 0n ? "stable" : "dot";
      const before = await transfer.balances(account.address);
      const hydrationBefore =
        tracks === "dot" ? before.hydrationDot : before.hydration[leg1Symbol];
      setBusy({
        title: "Send to Hydration",
        message: "Waiting for signature and inclusion...",
      });
      const receipt = await transfer.signAndSendMoveToHydration(
        tx,
        account.address,
        { signer: account.signer as any, withSignedTransaction: true },
      );
      setBusy(null);
      if (!receipt.success) {
        setError(
          `Transaction failed: ${JSON.stringify(receipt.dispatchError)}`,
        );
        return;
      }
      setPendingLeg1({
        account: account.address,
        symbol: leg1Symbol,
        amount,
        dotTopUp,
        tracks,
        hydrationBefore,
        receipt,
        deadline: Date.now() + DELIVERY_TIMEOUT_MS,
        status: "pending",
      });
      if (amount > 0n) {
        setLeg2Symbol(leg1Symbol);
        setLeg2Amount("");
      }
      // Start the next transfer blank rather than resending the same one.
      setLeg1Amount("");
      setTopUpEnabled(false);
      setTopUpAmount("");
      topUpEdited.current = false;
      loadBalances();
    } catch (err) {
      setBusy(null);
      setError(errorMessage(err));
    }
  };

  const beneficiaryValid = isHex(beneficiary) && beneficiary.length === 42;
  // Fees and balances do not depend on the beneficiary, so check with a
  // placeholder until one is chosen; submit still requires a real one.
  const checkBeneficiary = beneficiaryValid
    ? beneficiary
    : "0x0000000000000000000000000000000000000001";
  const leg2CheckKey =
    quoteKey && quote && fee && slippageBps !== null && balances
      ? `${quoteKey}|${slippageBps}|${checkBeneficiary}|${balances.hydration[leg2Symbol]}|${balances.hydrationDot}|${balances.hydrationNative}`
      : null;
  const [leg2Check, setLeg2Check] = useState<{
    key: string;
    errors: string[];
    txFee?: stables.ValidatedSwapAndBridge["data"]["txFee"];
  } | null>(null);
  // Paid in DOT, the tx fee draws on the same balance as the bridge fee.
  const leg2TxFee = leg2Check?.txFee ?? null;
  const leg2TxFeeInDot =
    leg2TxFee?.assetId === HYDRATION_DOT_ID ? leg2TxFee.amount : 0n;
  const leg2DotShortfall =
    balances && dotFee !== null
      ? dotFee + leg2TxFeeInDot - balances.hydrationDot
      : 0n;
  const leg2Checked =
    leg2Check && leg2Check.key === leg2CheckKey ? leg2Check : null;
  useEffect(() => {
    if (
      !transfer ||
      !sourceAddress ||
      !quote ||
      !fee ||
      slippageBps === null ||
      !leg2CheckKey
    )
      return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const validated = await withRetry(
          async () => {
            const tx = await transfer.swapAndBridgeTx(
              sourceAddress,
              checkBeneficiary,
              quote,
              slippageBps,
              fee,
            );
            return transfer.validateSwapAndBridge(tx);
          },
          () => cancelled,
        );
        if (!cancelled)
          setLeg2Check({
            key: leg2CheckKey,
            errors: errorMessages(validated.logs),
            txFee: validated.data.txFee,
          });
      } catch (err) {
        if (!cancelled)
          setLeg2Check({ key: leg2CheckKey, errors: [networkError(err)] });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    transfer,
    sourceAddress,
    checkBeneficiary,
    quote,
    fee,
    slippageBps,
    leg2CheckKey,
  ]);

  const submitLeg2 = async () => {
    if (!transfer || !account || !quote || !fee || slippageBps === null) return;
    if (
      quote.amountIn !== leg2AmountParsed ||
      quote.from.symbol !== leg2Symbol ||
      quote.to.symbol !== target
    ) {
      setError("The quote is out of date. Wait for it to refresh.");
      return;
    }
    if (!isHex(beneficiary) || beneficiary.length !== 42) {
      setError("Enter a valid Ethereum beneficiary address.");
      return;
    }
    try {
      setBusy({
        title: "Swap and send to Ethereum",
        message:
          "Dry running on Hydration, Asset Hub, Bridge Hub and Ethereum...",
      });
      const tx = await transfer.swapAndBridgeTx(
        account.address,
        beneficiary,
        quote,
        slippageBps,
        fee,
      );
      const validated = await transfer.validateSwapAndBridge(tx);
      if (!validated.success) {
        setBusy(null);
        setError(describeLogs(validated.logs, validated.data));
        return;
      }
      setBusy({
        title: "Swap and send to Ethereum",
        message: "Waiting for signature and inclusion...",
      });
      const receipt = await transfer.signAndSendSwapAndBridge(
        tx,
        account.address,
        { signer: account.signer as any, withSignedTransaction: true },
      );
      setBusy(null);
      if (!receipt.success) {
        setError(
          `Transaction failed: ${JSON.stringify(receipt.dispatchError)}`,
        );
        return;
      }
      const sourceAddressHex = toHex(account.address);
      const item: historyV2.ToEthereumTransferResult & {
        isWalletTransaction: boolean;
      } = {
        sourceId: stables.HYDRATION_PARA_ID,
        sourceKind: "polkadot",
        destinationId: registry.ethChainId,
        destinationKind: "ethereum",
        id: tx.messageId,
        status: historyV2.TransferStatus.Pending,
        info: {
          amount: tx.minAmountOut.toString(),
          sourceAddress: sourceAddressHex,
          beneficiaryAddress: beneficiary,
          tokenAddress: tx.to.token,
          when: new Date(),
        },
        submitted: {
          block_num: receipt.blockNumber,
          block_timestamp: 0,
          messageId: tx.messageId,
          account_id: sourceAddressHex,
          extrinsic_hash: receipt.txHash,
          success: true,
          bridgeHubMessageId: "",
          sourceParachainId: stables.HYDRATION_PARA_ID,
        },
        isWalletTransaction: true,
      };
      addPendingTransaction({ kind: "add", transfer: item });
      refreshHistory();
      router.push(
        `/txcomplete?transfer=${base64url.encode(JSON.stringify(item))}`,
      );
    } catch (err) {
      setBusy(null);
      setError(errorMessage(err));
    }
  };

  const fmt = (n: bigint, decimals: number) =>
    formatBalance({ number: n, decimals, displayDecimals: 4 });
  // A spinner while a value is being fetched, "-" when there is nothing to show.
  const pending = (loading: boolean) =>
    loading ? (
      <LucideLoaderCircle
        aria-label="Loading"
        className="inline-block w-3.5 h-3.5 animate-spin text-muted-foreground"
      />
    ) : (
      "-"
    );
  const leg1Loading = (!!leg1AmountParsed || dotTopUp > 0n) && !leg1Checked;
  const leg1ServiceLoading = !!leg1AmountParsed && leg1ServiceFee === null;
  const leg2QuoteLoading = !!leg2AmountParsed && !quote && !quoteError;
  const leg2TxFeeLoading = !leg2TxFee && (leg2QuoteLoading || !leg2Checked);
  const fmtFee = (n: bigint, decimals: number) =>
    formatBalance({ number: n, decimals, displayDecimals: 6 });
  const leg1Balance = balances?.assetHub[leg1Symbol] ?? null;
  const leg2Balance = balances?.hydration[leg2Symbol] ?? null;

  const stableOptions = (
    balancesOf: Record<stables.HydrationStableSymbol, bigint> | undefined,
  ): TokenOption[] =>
    SOURCE_SYMBOLS.map((sym) => ({
      key: sym,
      symbol: sym,
      name: stables.HYDRATION_STABLES[sym].name,
      balance: balancesOf
        ? fmt(balancesOf[sym], stables.HYDRATION_STABLES[sym].decimals)
        : undefined,
    }));
  const targetOptions: TokenOption[] = TARGET_SYMBOLS.map((sym) => ({
    key: sym,
    symbol: sym,
    name: `${sym} on Ethereum`,
  }));

  const accountButton = (
    balance: bigint | null,
    decimals: number,
    symbol: string,
  ) =>
    sourceAddress && (
      <button
        type="button"
        onClick={() => setAccountDialogOpen(true)}
        className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
      >
        <Image
          src={polkadotWallet?.logo?.src ?? "/images/polkadot.png"}
          width={16}
          height={16}
          alt="wallet"
          className="rounded-sm"
        />
        <span>{trimAccount(sourceAddress, 12)}</span>
        <span>
          {balance !== null ? `${fmt(balance, decimals)} ${symbol}` : "..."}
        </span>
      </button>
    );

  const percentPills = (
    balance: bigint | null,
    decimals: number,
    set: (v: string) => void,
  ) => (
    <div className="flex items-center justify-end gap-1">
      {[25, 50, 75, 100].map((percent) => (
        <Button
          key={percent}
          type="button"
          variant="clean"
          className="h-6 px-2 py-0.5 text-xs rounded-full border-0 glass-pill"
          disabled={balance === null || balance === 0n}
          onClick={() =>
            balance !== null &&
            set(formatUnits((balance * BigInt(percent)) / 100n, decimals))
          }
        >
          {percent === 100 ? "Max" : `${percent}%`}
        </Button>
      ))}
    </div>
  );

  // `held` shows the balance the fee draws on, in red when it falls short.
  const summaryRow = (
    label: string,
    value: ReactNode,
    held?: {
      balance: bigint;
      required: bigint;
      decimals: number;
      symbol: string;
    } | null,
  ) => (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-glass">{label}</dt>
      <dd className="text-primary text-right">
        {held && (
          <span
            className={`text-xs mr-2 ${
              held.balance < held.required
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            You have {fmt(held.balance, held.decimals)} {held.symbol} ·
          </span>
        )}
        {value}
      </dd>
    </div>
  );

  return (
    <Card className="w-full max-w-[min(42rem,calc(100vw-2rem))] glass border-white/60">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Stables to Ethereum</h2>
          <div className="flex gap-1">
            {([1, 2] as const).map((n) => (
              <Button
                key={n}
                type="button"
                variant="clean"
                className={`h-7 px-3 text-xs rounded-full border-0 glass-pill ${
                  step === n ? "font-semibold" : "opacity-60"
                }`}
                onClick={() => setStep(n)}
              >
                {n === 1 ? "1. To Hydration" : "2. To Ethereum"}
              </Button>
            ))}
          </div>
        </div>

        {(!polkadotAccounts || polkadotAccounts.length === 0) && (
          <ConnectPolkadotWalletButton variant="default" className="w-full" />
        )}

        {step === 1 && (
          <>
            {pendingLeg1 && (
              <div
                className={`rounded-xl border p-4 text-sm space-y-3 ${STATUS_STYLE[pendingLeg1.status]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    {pendingLeg1.status === "pending" && (
                      <LucideLoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    {pendingLeg1.status === "received" && (
                      <LucideCircleCheck className="h-4 w-4" />
                    )}
                    {pendingLeg1.status === "timeout" && (
                      <LucideTriangleAlert className="h-4 w-4" />
                    )}
                    {pendingLeg1.status === "pending" &&
                      "Sending to Hydration..."}
                    {pendingLeg1.status === "received" &&
                      "Arrived on Hydration"}
                    {pendingLeg1.status === "timeout" &&
                      "Not received on Hydration yet"}
                  </div>
                  {pendingLeg1.status !== "pending" && (
                    <button
                      type="button"
                      aria-label="Dismiss"
                      className="opacity-60 hover:opacity-100"
                      onClick={() => setPendingLeg1(null)}
                    >
                      <LucideX className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <dl className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <dt className="opacity-70">Sent</dt>
                    <dd>
                      {[
                        ...(pendingLeg1.amount > 0n
                          ? [
                              `${fmt(
                                pendingLeg1.amount,
                                stables.HYDRATION_STABLES[pendingLeg1.symbol]
                                  .decimals,
                              )} ${pendingLeg1.symbol}`,
                            ]
                          : []),
                        ...(pendingLeg1.dotTopUp > 0n
                          ? [`${fmt(pendingLeg1.dotTopUp, DOT_DECIMALS)} DOT`]
                          : []),
                      ].join(" + ")}
                    </dd>
                  </div>
                  {pendingLeg1.received !== undefined && (
                    <div className="flex justify-between gap-2">
                      <dt className="opacity-70">Received (after fees)</dt>
                      <dd>
                        {pendingLeg1.tracks === "dot"
                          ? `${fmt(pendingLeg1.received, DOT_DECIMALS)} DOT`
                          : `${fmt(
                              pendingLeg1.received,
                              stables.HYDRATION_STABLES[pendingLeg1.symbol]
                                .decimals,
                            )} ${pendingLeg1.symbol}`}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt className="opacity-70">Route</dt>
                    <dd>Asset Hub → Hydration</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="opacity-70">Asset Hub block</dt>
                    <dd>
                      <a
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                        href={subscanExtrinsicLink(
                          registry.environment,
                          `polkadot_${registry.assetHubParaId}`,
                          `${pendingLeg1.receipt.blockNumber}-${pendingLeg1.receipt.txIndex}`,
                        )}
                      >
                        #{pendingLeg1.receipt.blockNumber}
                      </a>
                    </dd>
                  </div>
                </dl>
                {pendingLeg1.status === "received" && (
                  <button
                    type="button"
                    className="underline font-medium"
                    onClick={() => setStep(2)}
                  >
                    Continue to step 2
                  </button>
                )}
                {pendingLeg1.status === "timeout" && (
                  <p>
                    Check the transfer on Subscan before retrying.{" "}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() =>
                        setPendingLeg1({
                          ...pendingLeg1,
                          status: "pending",
                          deadline: Date.now() + DELIVERY_TIMEOUT_MS,
                        })
                      }
                    >
                      Check again
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Once sent, only the progress card shows until it is dismissed. */}
            {!pendingLeg1 && (
              <>
                <div className="amountContainer flex flex-col w-full px-3 py-3 gap-2">
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Send from Asset Hub</span>
                    {accountButton(
                      leg1Balance,
                      leg1Stable.decimals,
                      leg1Symbol,
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    <input
                      className="amountInput flex-1 text-left text-2xl sm:text-3xl font-medium bg-transparent border-0 outline-none placeholder:text-muted-foreground min-w-0"
                      value={leg1Amount}
                      onChange={(e) => setLeg1Amount(e.target.value)}
                      placeholder="0.0"
                    />
                    <StableTokenSelector
                      value={leg1Symbol}
                      onChange={(v) => {
                        setLeg1Symbol(v as stables.HydrationStableSymbol);
                        setLeg1Amount("");
                      }}
                      options={stableOptions(balances?.assetHub)}
                    />
                  </div>
                  {percentPills(
                    leg1Balance,
                    leg1Stable.decimals,
                    setLeg1Amount,
                  )}
                </div>

                <div className="rounded-lg border border-muted bg-muted/40 px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      id="topUp"
                      type="checkbox"
                      className="accent-primary w-5 h-5 rounded focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
                      checked={topUpEnabled}
                      onChange={(e) => setTopUpEnabled(e.target.checked)}
                    />
                    <Label
                      htmlFor="topUp"
                      className="text-base font-medium cursor-pointer select-none"
                    >
                      Send DOT to Hydration{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        (for step 2 fees)
                      </span>
                    </Label>
                  </div>
                  {topUpEnabled && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="flex items-center gap-1 w-full">
                        <span className="text-xs text-muted-foreground mr-1">
                          Step 2 delivery
                        </span>
                        {[
                          { label: "Normal", value: false },
                          { label: "Accelerated", value: true },
                        ].map((o) => (
                          <Button
                            key={o.label}
                            type="button"
                            variant="clean"
                            className={`h-6 px-2 py-0.5 text-xs rounded-full border-0 glass-pill ${
                              accelerated === o.value
                                ? "font-semibold"
                                : "opacity-60"
                            }`}
                            onClick={() => {
                              // A new mode needs a new amount; re-apply the suggestion.
                              topUpEdited.current = false;
                              setAccelerated(o.value);
                            }}
                          >
                            {o.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 w-full">
                        <input
                          aria-label="DOT amount to send to Hydration"
                          className="amountInput w-24 flex-shrink-0 rounded-lg !px-3 py-1.5 text-sm !bg-[var(--glass-bg)] !text-primary outline-none focus:ring-1 focus:ring-primary"
                          value={topUpAmount}
                          onChange={(e) => {
                            topUpEdited.current = true;
                            setTopUpAmount(e.target.value);
                          }}
                          placeholder="0.0"
                        />
                        <span className="text-sm flex-shrink-0">DOT</span>
                        <div className="flex-1 min-w-0 pl-3 text-xs leading-snug text-muted-foreground">
                          {step2Estimating ? (
                            <span className="inline-flex items-center gap-1.5">
                              <LucideLoaderCircle className="w-3.5 h-3.5 animate-spin" />
                              Estimating step 2 fees...
                            </span>
                          ) : (
                            step2DotNeeds !== null &&
                            balances && (
                              <span>
                                Step 2 needs about{" "}
                                {fmt(step2DotNeeds.normal, DOT_DECIMALS)} DOT
                                (normal) or{" "}
                                {fmt(step2DotNeeds.accelerated, DOT_DECIMALS)}{" "}
                                DOT (accelerated); you have{" "}
                                {fmt(balances.hydrationDot, DOT_DECIMALS)} on
                                Hydration.
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <dl className="glass-sub p-4 space-y-2 card-shadow">
                  {summaryRow("Destination", "Hydration (same account)")}
                  {summaryRow(
                    "Hydration fee",
                    leg1HydrationFeeText ?? pending(leg1Loading),
                  )}
                  {summaryRow(
                    "Asset Hub fee",
                    leg1NetworkFees
                      ? `${fmtFee(leg1AssetHubFee, DOT_DECIMALS)} DOT${
                          leg1NetworkFees.assetHubDelivery === undefined
                            ? " + delivery"
                            : ""
                        }`
                      : pending(leg1Loading),
                  )}
                  {summaryRow(
                    "Service fee",
                    leg1ServiceFee !== null
                      ? `${fmt(leg1ServiceFee, DOT_DECIMALS)} DOT`
                      : pending(leg1ServiceLoading),
                  )}
                  {dotTopUp > 0n &&
                    summaryRow(
                      "DOT to Hydration",
                      `${fmt(dotTopUp, DOT_DECIMALS)} DOT`,
                    )}
                  <div className="border-t border-white/40 dark:border-slate-700 pt-2 font-medium">
                    {summaryRow(
                      "Total fee",
                      leg1NetworkFees && leg1ServiceFee !== null
                        ? `${fmt(
                            leg1AssetHubFee +
                              leg1ServiceFee +
                              (leg1NetworkFees.hydrationDotExecution ?? 0n),
                            DOT_DECIMALS,
                          )} DOT${
                            leg1NetworkFees.hydrationExecution !== undefined
                              ? ` + ${fmtFee(
                                  leg1NetworkFees.hydrationExecution,
                                  leg1Stable.decimals,
                                )} ${leg1Symbol}`
                              : ""
                          }`
                        : pending(leg1Loading || leg1ServiceLoading),
                      balances && leg1NetworkFees && leg1ServiceFee !== null
                        ? {
                            balance: balances.assetHubDot,
                            required:
                              leg1AssetHubFee + leg1ServiceFee + dotTopUp,
                            decimals: DOT_DECIMALS,
                            symbol: "DOT",
                          }
                        : null,
                    )}
                  </div>
                </dl>

                <StatusAlert
                  errors={[
                    ...(balancesError && !balances ? [balancesError] : []),
                    ...(leg1Checked?.errors ?? []),
                  ]}
                  info={
                    leg1CheckKey && !leg1Checked
                      ? "Checking the transfer..."
                      : null
                  }
                  busy={!!leg1CheckKey && !leg1Checked}
                />

                <Button
                  className="w-full action-button"
                  onClick={submitLeg1}
                  disabled={
                    !transfer ||
                    !account ||
                    (!leg1AmountParsed && dotTopUp === 0n) ||
                    leg1ServiceFee === null ||
                    !leg1Checked ||
                    leg1Checked.errors.length > 0
                  }
                >
                  Send to Hydration
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Already on Hydration?{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setStep(2)}
                  >
                    Skip to step 2
                  </button>
                </p>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="amountContainer flex flex-col w-full px-3 py-3 gap-2">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Swap on Hydration</span>
                {accountButton(leg2Balance, leg2Stable.decimals, leg2Symbol)}
              </div>
              <div className="flex flex-row items-center gap-2">
                <input
                  className="amountInput flex-1 text-left text-2xl sm:text-3xl font-medium bg-transparent border-0 outline-none placeholder:text-muted-foreground min-w-0"
                  value={leg2Amount}
                  onChange={(e) => setLeg2Amount(e.target.value)}
                  placeholder="0.0"
                />
                <StableTokenSelector
                  value={leg2Symbol}
                  onChange={(v) => {
                    setLeg2Symbol(v as stables.HydrationStableSymbol);
                    setLeg2Amount("");
                  }}
                  options={stableOptions(balances?.hydration)}
                />
              </div>
              {percentPills(leg2Balance, leg2Stable.decimals, setLeg2Amount)}
            </div>

            <div className="amountContainer flex flex-col w-full px-3 py-3 gap-2">
              <div className="text-sm text-muted-foreground">
                Receive on Ethereum
              </div>
              <div className="flex flex-row items-center gap-2">
                <input
                  readOnly
                  tabIndex={-1}
                  className="amountInput flex-1 text-left text-2xl sm:text-3xl font-medium bg-transparent border-0 outline-none placeholder:text-muted-foreground min-w-0"
                  value={
                    quote && minReceived !== null
                      ? formatUnits(minReceived, quote.to.decimals)
                      : ""
                  }
                  placeholder={leg2AmountParsed && !quoteError ? "..." : "0.0"}
                />
                <StableTokenSelector
                  value={target}
                  onChange={(v) => setTarget(v as stables.EthereumStableSymbol)}
                  options={targetOptions}
                />
              </div>
            </div>

            <SelectAccount
              accounts={beneficiaries}
              field={{ value: beneficiary, onChange: setBeneficiary }}
              allowManualInput={true}
            />

            <div className="rounded-lg border border-muted bg-muted/40 px-4 py-3 flex items-center gap-3">
              <input
                id="accelerated"
                type="checkbox"
                className="accent-primary w-5 h-5 rounded focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
                checked={accelerated}
                onChange={(e) => setAccelerated(e.target.checked)}
              />
              <Label
                htmlFor="accelerated"
                className="text-base font-medium cursor-pointer select-none"
              >
                Accelerated delivery{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (higher fee, faster)
                </span>
              </Label>
            </div>

            <dl className="glass-sub p-4 space-y-2 card-shadow">
              {summaryRow(
                "Swap quote",
                quote
                  ? `${formatUnits(quote.amountOut, quote.to.decimals)} ${target}`
                  : pending(leg2QuoteLoading),
              )}
              {summaryRow(
                "Max slippage",
                <span className="inline-flex gap-1">
                  {["0.1", "0.5", "1"].map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant="clean"
                      className={`h-6 px-2 py-0.5 text-xs rounded-full border-0 glass-pill ${
                        slippage === v ? "font-semibold" : "opacity-60"
                      }`}
                      onClick={() => setSlippage(v)}
                    >
                      {v}%
                    </Button>
                  ))}
                </span>,
              )}
              {summaryRow(
                "Bridge fee",
                dotFee !== null
                  ? `${fmt(dotFee - leg2ServiceFee, DOT_DECIMALS)} DOT`
                  : pending(leg2QuoteLoading),
              )}
              {summaryRow(
                "Service fee",
                fee
                  ? `${fmt(leg2ServiceFee, DOT_DECIMALS)} DOT`
                  : pending(leg2QuoteLoading),
              )}
              {summaryRow(
                "Hydration tx fee",
                leg2TxFee
                  ? `${fmtFee(leg2TxFee.amount, leg2TxFee.decimals)} ${leg2TxFee.symbol}`
                  : pending(!!leg2AmountParsed && leg2TxFeeLoading),
                leg2TxFee?.assetId === HYDRATION_HDX_ID && balances
                  ? {
                      balance: balances.hydrationNative,
                      required: leg2TxFee.amount,
                      decimals: HDX_DECIMALS,
                      symbol: "HDX",
                    }
                  : null,
              )}
              <div className="border-t border-white/40 dark:border-slate-700 pt-2 font-medium">
                {summaryRow(
                  "Total fee",
                  dotFee !== null
                    ? `${fmt(dotFee + leg2TxFeeInDot, DOT_DECIMALS)} DOT${
                        leg2TxFee && leg2TxFeeInDot === 0n
                          ? ` + ${fmtFee(leg2TxFee.amount, leg2TxFee.decimals)} ${leg2TxFee.symbol}`
                          : ""
                      }`
                    : pending(leg2QuoteLoading),
                  balances && dotFee !== null
                    ? {
                        balance: balances.hydrationDot,
                        required: dotFee + leg2TxFeeInDot,
                        decimals: DOT_DECIMALS,
                        symbol: "DOT",
                      }
                    : null,
                )}
              </div>
            </dl>

            <StatusAlert
              errors={[
                ...(balancesError && !balances ? [balancesError] : []),
                ...(quoteError ? [quoteError] : []),
                ...(leg2Checked?.errors ?? []),
              ]}
              info={
                leg2AmountParsed && !quote && !quoteError
                  ? "Getting a quote..."
                  : leg2CheckKey && !leg2Checked
                    ? "Checking the transfer..."
                    : !beneficiaryValid
                      ? "Choose an Ethereum beneficiary to continue."
                      : null
              }
              busy={
                (!!leg2AmountParsed && !quote && !quoteError) ||
                (!!leg2CheckKey && !leg2Checked)
              }
            />

            {leg2DotShortfall > 0n && (
              <button
                type="button"
                className="text-sm underline self-start"
                onClick={() => {
                  setStep(1);
                  setTopUpEnabled(true);
                  topUpEdited.current = true;
                  setTopUpAmount(
                    formatUnits(
                      roundUpToTenthDot((leg2DotShortfall * 125n) / 100n),
                      DOT_DECIMALS,
                    ),
                  );
                  // Send only DOT; the stable is already on Hydration.
                  leg1Prefilled.current = `${sourceAddress}|${leg1Symbol}`;
                  setLeg1Amount("");
                }}
              >
                Send DOT to Hydration
              </button>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Swap and bridge run in one transaction.
            </p>
            <Button
              className="w-full action-button"
              onClick={submitLeg2}
              disabled={
                !transfer ||
                !account ||
                !quote ||
                !fee ||
                slippageBps === null ||
                !beneficiaryValid ||
                leg1InFlight ||
                !leg2Checked ||
                leg2Checked.errors.length > 0
              }
            >
              {leg1InFlight
                ? "Waiting for funds on Hydration..."
                : "Swap and send to Ethereum"}
            </Button>
          </>
        )}
      </CardContent>

      <PolkadotAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        accounts={(polkadotAccounts ?? []).filter(
          filterByAccountType("AccountId32"),
        )}
        selected={sourceAddress}
        onSelect={(a) => {
          setSourceAddress(a.address);
          setLeg1Amount("");
          setLeg2Amount("");
          setPendingLeg1(null);
          setAccountDialogOpen(false);
        }}
      />
      <BusyDialog
        open={busy !== null}
        title={busy?.title}
        description={busy?.message ?? ""}
      />
      <ErrorDialog
        open={error !== null}
        title="Transfer blocked"
        description={error ?? ""}
        dismiss={() => setError(null)}
      />
    </Card>
  );
};
