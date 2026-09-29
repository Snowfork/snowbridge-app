"use client";

import {
  FC,
  Fragment,
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
import type { SnowbridgeClient } from "@/lib/snowbridge";
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
import { ConnectEthereumWalletButton } from "@/components/ConnectEthereumWalletButton";
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
  LucideArrowRight,
  LucideTriangleAlert,
  LucideX,
} from "lucide-react";
import { formatBalance, formatUsdValue, trimAccount } from "@/utils/formatting";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import { subscanExtrinsicLink } from "@/lib/explorerLinks";
import { errorMessage } from "@/utils/errorMessage";

const DOT_DECIMALS = 10;
const SOURCE_SYMBOLS = Object.keys(
  stables.HYDRATION_STABLES,
) as stables.HydrationStableSymbol[];
const TARGET_SYMBOLS = Object.keys(
  stables.ETHEREUM_STABLES,
) as stables.EthereumStableSymbol[];

const HYDRATION_DOT_ID = 5;
// Headroom for the step 2 tx fee when suggesting a DOT top-up.
const STEP2_TX_FEE_BUFFER = 200_000_000n;
const roundUpToTenthDot = (planck: bigint) =>
  ((planck + 999_999_999n) / 1_000_000_000n) * 1_000_000_000n;
const TOP_UP_PAD_PERCENT = 25n;

// DOT to send so step 2 can pay `fee` (and its tx fee, when paid in DOT), rounded up
// to a tenth of a DOT.
async function suggestTopUp(
  transfer: ReturnType<SnowbridgeClient["stables"]>,
  account: string,
  fee: toEthereumV2.DeliveryFee,
  txFee = STEP2_TX_FEE_BUFFER,
): Promise<bigint> {
  const topUp = await transfer.dotTopUp(account, fee, {
    padPercentage: TOP_UP_PAD_PERCENT,
    txFee,
  });
  return topUp > 0n ? roundUpToTenthDot(topUp) : 0n;
}
const MAX_SLIPPAGE_PERCENT = 5;
// Expected Hydration to Ethereum delivery; normal matches /send.
const DELIVERY_TIME = { normal: "~35 min", accelerated: "~2 min" };
const DELIVERY_OPTIONS = [
  { label: `Normal (${DELIVERY_TIME.normal})`, value: false },
  { label: `Accelerated (${DELIVERY_TIME.accelerated})`, value: true },
];
const DELIVERY_POLL_MS = 6_000;
const BALANCE_REFRESH_MS = 15_000;
// Ethereum gas can triple within minutes, so fee quotes are refreshed while shown
// and fetched again at submit.
const QUOTE_REFRESH_MS = 30_000;
// A step 1 fee computed longer ago than this blocks the step until a refresh succeeds.
// fetchTokenPrices caches for 5 minutes too, so the DOT price behind a usable fee is
// at most about 10 minutes old.
const LEG1_FEE_MAX_AGE_MS = 5 * 60_000;
// Stop at submit when the fee rose more than this since it was shown.
const FEE_RISE_TOLERANCE_PERCENT = 10n;
const dotTotal = (fee: toEthereumV2.DeliveryFee) =>
  fee.totals.find((t) => t.symbol === "DOT")?.amount ?? 0n;
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

// Step 1 charges a fixed fee, so it needs only the DOT price.
async function leg1FeeParams(): Promise<
  stables.MoveToHydrationFeeParams | undefined
> {
  const recipient = serviceFeeRecipientFromEnv();
  if (!recipient) return undefined;
  const dotUsd = (await fetchTokenPrices(["DOT"]))["DOT"];
  // The fee is mandatory once a recipient is set, so no price means no transfer.
  if (!dotUsd) throw new Error("No DOT price for the step 1 service fee.");
  return {
    dotToUsdNumerator: toCents(dotUsd),
    dotToUsdDenominator: 100n,
    serviceFeeRecipient: recipient,
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

// Non-empty input that is not a non-negative amount with at most `decimals` places.
function isInvalidAmount(value: string, decimals: number): boolean {
  if (value.trim() === "") return false;
  try {
    return parseUnits(value.trim(), decimals) < 0n;
  } catch {
    return true;
  }
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

// Amounts filled in for the user (Max, prefill) show at most this many decimals;
// the exact value is kept so no dust is left behind.
const DISPLAY_DECIMALS = 6;
function displayAmount(value: bigint, decimals: number): string {
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const cut = fraction.slice(0, DISPLAY_DECIMALS).replace(/0+$/, "");
  return cut ? `${whole}.${cut}` : whole;
}
type ExactAmount = { symbol: string; display: string; value: bigint } | null;
// The exact value while the input still shows what was filled in.
function amountValue(
  input: string,
  exact: ExactAmount,
  symbol: string,
  decimals: number,
): bigint | null {
  return exact && exact.symbol === symbol && exact.display === input
    ? exact.value
    : parseAmount(input, decimals);
}
// Stables are dollar pegged; use $1 when the indexer has no price.
const PEGGED = new Set(["HOLLAR", "USDT", "USDC"]);

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

// Dry-run warnings are diagnostics (e.g. the forked Ethereum RPC being
// unreachable), not something the user can act on, so they only go to the console.
function warningMessages(logs: toEthereumV2.ValidationLog[]): string[] {
  const warnings = logs.filter(
    (l) => l.kind === toEthereumV2.ValidationKind.Warning,
  );
  warnings
    .filter((l) => l.reason === toEthereumV2.ValidationReason.DryRunFailed)
    .forEach((l) => console.warn("Dry run warning:", l.message));
  return warnings
    .filter((l) => l.reason !== toEthereumV2.ValidationReason.DryRunFailed)
    .map((l) => l.message);
}

// The SDK leaves the block number unset when the signer's result omits it. The
// transaction has already succeeded here, so a failed lookup is not an error.
async function withBlockNumber(
  api: SnowbridgeClient,
  paraId: number,
  receipt: stables.SubmitReceipt,
): Promise<stables.SubmitReceipt> {
  if (receipt.blockNumber !== undefined) return receipt;
  try {
    const chain = await api.context.parachain(paraId);
    const header = await chain.rpc.chain.getHeader(receipt.blockHash);
    return { ...receipt, blockNumber: header.number.toNumber() };
  } catch (err) {
    console.warn("Could not look up the block number:", err);
    return receipt;
  }
}

// Errors block the action button; warnings do not.
const StatusAlert: FC<{
  errors: string[];
  warnings?: string[];
  action?: { label: string; onClick: () => void };
}> = ({ errors, warnings = [], action }) => {
  if (errors.length > 0) {
    return (
      <div className="w-full rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
          <LucideTriangleAlert className="flex-shrink-0 mt-0.5 w-4 h-4" />
          <div className="space-y-2">
            {errors.length === 1 ? (
              <span>{errors[0]}</span>
            ) : (
              <ul className="space-y-1 list-disc pl-4">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {action && (
              <button
                type="button"
                className="block font-medium underline underline-offset-2"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (warnings.length === 0) return null;
  return (
    <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-3">
      <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
        <LucideTriangleAlert className="flex-shrink-0 mt-0.5 w-4 h-4" />
        <ul className="space-y-1">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>
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
  // Asset Hub and Hydration take AccountId32 accounts only.
  const substrateAccounts = useMemo(
    () => (polkadotAccounts ?? []).filter(filterByAccountType("AccountId32")),
    [polkadotAccounts],
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

  // Tagged with their account, so a switch never shows the previous account's.
  const [loadedBalances, setLoadedBalances] = useState<{
    account: string;
    value: stables.StableBalances;
  } | null>(null);
  const balances =
    loadedBalances && loadedBalances.account === sourceAddress
      ? loadedBalances.value
      : null;
  const [balancesError, setBalancesError] = useState<string | null>(null);
  // Drop stale responses, e.g. from a previous account.
  const balancesRequest = useRef(0);
  const loadBalances = useCallback(async () => {
    if (!transfer || !sourceAddress) return null;
    const id = ++balancesRequest.current;
    try {
      const result = await transfer.balances(sourceAddress);
      // A newer request owns the page state, but this result is still valid for
      // `sourceAddress`, so callers such as the arrival watcher can use it.
      if (id !== balancesRequest.current) return result;
      setLoadedBalances({ account: sourceAddress, value: result });
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
  // After a send the form is hidden behind the progress card until "Send more".
  const [leg1FormOpen, setLeg1FormOpen] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [feeBreakdownOpen, setFeeBreakdownOpen] = useState(false);
  const [leg1Exact, setLeg1Exact] = useState<ExactAmount>(null);
  const [leg2Exact, setLeg2Exact] = useState<ExactAmount>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setRefreshTick((t) => t + 1);
    }, QUOTE_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  // Step 1's top-up estimate and fee refresh only while step 1 is shown.
  const topUpRefresh = step === 1 ? refreshTick : 0;
  useEffect(() => {
    fetchTokenPrices(["DOT", "HDX", ...SOURCE_SYMBOLS])
      .then(setPrices)
      .catch((err) => console.error("Could not load prices:", err));
  }, []);
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
    const balance = balances.assetHub[leg1Symbol];
    if (leg1Amount === "" && balance > 0n) {
      const display = displayAmount(balance, leg1Stable.decimals);
      setLeg1Exact({ symbol: leg1Symbol, display, value: balance });
      setLeg1Amount(display);
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
    const balance = balances.hydration[leg2Symbol];
    if (leg2Amount === "" && balance > 0n) {
      const display = displayAmount(balance, leg2Stable.decimals);
      setLeg2Exact({ symbol: leg2Symbol, display, value: balance });
      setLeg2Amount(display);
    }
  }, [
    leg1InFlight,
    balances,
    sourceAddress,
    leg2Amount,
    leg2Symbol,
    leg2Stable.decimals,
  ]);

  // A wallet switch can drop the selected account; follow the wallet's current one and
  // start clean, as a manual account switch does.
  useEffect(() => {
    if (substrateAccounts.length === 0) return;
    if (substrateAccounts.some((a) => a.address === sourceAddress)) return;
    const next =
      substrateAccounts.find(
        (a) => a.address === selectedPolkadotAccount?.address,
      ) ?? substrateAccounts[0];
    setSourceAddress(next.address);
    setLeg1Amount("");
    setLeg2Amount("");
    setLeg1Exact(null);
    setLeg2Exact(null);
    setPendingLeg1(null);
  }, [substrateAccounts, sourceAddress, selectedPolkadotAccount]);

  // Read after awaits, when the selection or input may have changed.
  const sourceAddressRef = useRef(sourceAddress);
  sourceAddressRef.current = sourceAddress;
  const leg2SymbolRef = useRef(leg2Symbol);
  leg2SymbolRef.current = leg2Symbol;
  const leg2AmountRef = useRef(leg2Amount);
  leg2AmountRef.current = leg2Amount;
  // Poll until leg 1 lands, then fill step 2 with the amount received.
  useEffect(() => {
    if (!pendingLeg1 || pendingLeg1.status !== "pending") return;
    if (pendingLeg1.account !== sourceAddress) return;
    // One poll at a time, and none acting after this card is replaced or dismissed.
    let inFlight = false;
    let cancelled = false;
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      const latest = await loadBalances().finally(() => {
        inFlight = false;
      });
      if (cancelled) return;
      const now =
        pendingLeg1.tracks === "dot"
          ? latest?.hydrationDot
          : latest?.hydration[pendingLeg1.symbol];
      if (now !== undefined && now > pendingLeg1.hydrationBefore) {
        const received = now - pendingLeg1.hydrationBefore;
        setPendingLeg1({ ...pendingLeg1, status: "received", received });
        if (
          pendingLeg1.tracks === "stable" &&
          leg2SymbolRef.current === pendingLeg1.symbol
        ) {
          const display = displayAmount(
            received,
            stables.HYDRATION_STABLES[pendingLeg1.symbol].decimals,
          );
          // Only an empty input is filled; one the user set keeps its own amount.
          if (leg2AmountRef.current === "") {
            setLeg2Exact({
              symbol: pendingLeg1.symbol,
              display,
              value: received,
            });
            setLeg2Amount(display);
          }
        }
      } else if (Date.now() > pendingLeg1.deadline) {
        setPendingLeg1({ ...pendingLeg1, status: "timeout" });
      }
    };
    const timer = setInterval(poll, DELIVERY_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pendingLeg1, sourceAddress, loadBalances]);

  const leg2AmountParsed = amountValue(
    leg2Amount,
    leg2Exact,
    leg2Symbol,
    leg2Stable.decimals,
  );
  // A quote is only valid for the inputs it was fetched for.
  const quoteKey =
    sourceAddress && leg2AmountParsed
      ? `${sourceAddress}|${leg2Symbol}|${target}|${leg2AmountParsed}`
      : null;
  const [quoted, setQuoted] = useState<{
    key: string;
    quote: stables.SwapQuote;
    fees: {
      normal: toEthereumV2.DeliveryFee;
      accelerated: toEthereumV2.DeliveryFee;
    };
  } | null>(null);
  const quote = quoted && quoted.key === quoteKey ? quoted.quote : null;
  const fees = quoted && quoted.key === quoteKey ? quoted.fees : null;
  const fee = fees ? (accelerated ? fees.accelerated : fees.normal) : null;
  // Only step 2 shows the quote, so only it refreshes.
  const quoteRefresh = step === 2 ? refreshTick : 0;
  useEffect(() => {
    // A refresh of the same inputs keeps the current quote on screen until it lands.
    setQuoted((prev) => (prev && prev.key === quoteKey ? prev : null));
    setQuoteError(null);
    if (!transfer || !sourceAddress || !leg2AmountParsed || !quoteKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [q, normal, fast] = await withRetry(
          async () => {
            const volumeFee = await leg2VolumeFee(leg2Symbol, leg2AmountParsed);
            return Promise.all([
              transfer.quote(
                sourceAddress,
                leg2Symbol,
                target,
                leg2AmountParsed,
              ),
              transfer.swapAndBridgeFee(target, { volumeFee }),
              transfer.swapAndBridgeFee(target, {
                accelerated: true,
                volumeFee,
              }),
            ]);
          },
          () => cancelled,
        );
        if (cancelled) return;
        setQuoted({
          key: quoteKey,
          quote: q,
          fees: { normal, accelerated: fast },
        });
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
    quoteRefresh,
  ]);

  const slippageBps = useMemo(() => {
    const n = Number(slippage);
    if (!Number.isFinite(n) || n < 0 || n > MAX_SLIPPAGE_PERCENT) return null;
    return BigInt(Math.round(n * 100));
  }, [slippage]);
  const minReceived =
    quote && slippageBps !== null
      ? quote.amountOut - (quote.amountOut * slippageBps) / 10_000n
      : null;
  const dotFee = fee?.totals.find((t) => t.symbol === "DOT")?.amount ?? null;
  const leg2ServiceFee =
    fee?.breakdown.serviceFee?.find((t) => t.symbol === "DOT")?.amount ?? 0n;

  const leg1AmountParsed = amountValue(
    leg1Amount,
    leg1Exact,
    leg1Symbol,
    leg1Stable.decimals,
  );
  // The fee shown is the fee charged: submit reuses these params. Step 1 charges its
  // fixed fee on every transfer, a DOT-only top-up included.
  const sendsLeg1 = !!leg1AmountParsed || dotTopUp > 0n;
  const leg1FeeKey = sendsLeg1 ? "step1" : null;
  const [leg1Fee, setLeg1Fee] = useState<{
    key: string;
    params?: stables.MoveToHydrationFeeParams;
    amount: bigint;
    fetchedAt: number;
  } | null>(null);
  const [leg1FeeError, setLeg1FeeError] = useState<string | null>(null);
  // Re-evaluated on every refresh tick, so an old price stops being used.
  const leg1FeeCurrent =
    leg1Fee !== null &&
    leg1Fee.key === leg1FeeKey &&
    Date.now() - leg1Fee.fetchedAt <= LEG1_FEE_MAX_AGE_MS;
  const leg1ServiceFee = !leg1FeeKey
    ? 0n
    : leg1FeeCurrent
      ? leg1Fee.amount
      : null;
  useEffect(() => {
    if (!transfer || !leg1FeeKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { params, serviceFee } = await withRetry(
          async () => {
            const params = await leg1FeeParams();
            return {
              params,
              serviceFee: await transfer.moveToHydrationServiceFee(params),
            };
          },
          () => cancelled,
        );
        if (!cancelled) {
          setLeg1Fee({
            key: leg1FeeKey,
            params,
            amount: serviceFee?.amount ?? 0n,
            fetchedAt: Date.now(),
          });
          setLeg1FeeError(null);
        }
      } catch (err) {
        console.error("Could not compute the service fee:", err);
        if (!cancelled)
          setLeg1FeeError(
            "Couldn't get the DOT price for the $1 service fee. Retrying...",
          );
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Refreshed with the quotes, as the DOT price moves.
  }, [transfer, leg1FeeKey, topUpRefresh]);

  // Fee estimate and validation, re-run when the inputs or relevant balances change.
  const leg1CheckKey =
    sourceAddress &&
    (leg1AmountParsed || dotTopUp > 0n) &&
    leg1ServiceFee !== null &&
    balances
      ? `${sourceAddress}|${leg1Symbol}|${leg1AmountParsed ?? 0n}|${dotTopUp}|${leg1ServiceFee}|${balances.assetHub[leg1Symbol]}|${balances.hydration[leg1Symbol]}|${balances.assetHubDot}|${balances.hydrationDot}`
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
        const validated = await withRetry(
          async () => {
            const tx = await transfer.moveToHydrationTx(
              sourceAddress,
              leg1Symbol,
              leg1AmountParsed ?? 0n,
              {
                volumeFee: leg1Fee?.params,
                dotTopUp,
              },
            );
            return transfer.validateMoveToHydration(tx);
          },
          () => cancelled,
        );
        if (!cancelled)
          setLeg1Check({
            key: leg1CheckKey,
            fees: validated.data.fees,
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

  // Suggest DOT for step 2 for both delivery modes, so switching needs no refetch.
  const [suggestedTopUps, setSuggestedTopUps] = useState<{
    normal: bigint;
    accelerated: bigint;
  } | null>(null);
  const suggestedTopUp = suggestedTopUps
    ? accelerated
      ? suggestedTopUps.accelerated
      : suggestedTopUps.normal
    : null;
  // Once the user ticks or unticks the top-up, stop ticking it for them.
  const topUpTouched = useRef(false);
  const hydrationDotHeld = balances?.hydrationDot;
  useEffect(() => {
    if (!transfer || !sourceAddress || step !== 1) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        // Step 2's volume fee is on what gets swapped: this transfer, or for a
        // DOT-only top-up, the stable already on Hydration.
        const volumeFee = leg1AmountParsed
          ? await leg2VolumeFee(leg1Symbol, leg1AmountParsed)
          : leg2AmountParsed
            ? await leg2VolumeFee(leg2Symbol, leg2AmountParsed)
            : undefined;
        const topUps = await withRetry(
          async () => {
            const [normal, fast] = await Promise.all([
              transfer.swapAndBridgeFee(target, { volumeFee }),
              transfer.swapAndBridgeFee(target, {
                accelerated: true,
                volumeFee,
              }),
            ]);
            const [normalTopUp, fastTopUp] = await Promise.all([
              suggestTopUp(transfer, sourceAddress, normal),
              suggestTopUp(transfer, sourceAddress, fast),
            ]);
            return { normal: normalTopUp, accelerated: fastTopUp };
          },
          () => cancelled,
        );
        if (!cancelled) setSuggestedTopUps(topUps);
      } catch (err) {
        console.error("Could not estimate the step 2 fees:", err);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    transfer,
    sourceAddress,
    step,
    leg1Symbol,
    leg1AmountParsed,
    leg2Symbol,
    leg2AmountParsed,
    target,
    hydrationDotHeld,
    topUpRefresh,
  ]);
  useEffect(() => {
    if (suggestedTopUp === null) return;
    if (!topUpTouched.current) setTopUpEnabled(suggestedTopUp > 0n);
    if (!topUpEdited.current && suggestedTopUp > 0n) {
      setTopUpAmount(formatUnits(suggestedTopUp, DOT_DECIMALS));
    }
  }, [suggestedTopUp]);

  const submitLeg1 = async () => {
    if (!transfer || !account) return;
    if (leg1InputErrors.length > 0) {
      setError(leg1InputErrors[0]);
      return;
    }
    const amount = leg1AmountParsed ?? 0n;
    if (amount === 0n && dotTopUp === 0n) {
      setError(`Enter a ${leg1Symbol} amount or DOT to send.`);
      return;
    }
    // Aged at click time; the render-time flag may predate a hidden-tab stretch.
    if (
      !leg1FeeCurrent ||
      Date.now() - leg1Fee.fetchedAt > LEG1_FEE_MAX_AGE_MS
    ) {
      setError("The service fee is being updated. Try again in a moment.");
      return;
    }
    try {
      setBusy({
        title: "Send to Hydration",
        message: "Dry running on Polkadot Hub and Hydration...",
      });
      const tx = await transfer.moveToHydrationTx(
        account.address,
        leg1Symbol,
        amount,
        {
          volumeFee: leg1Fee?.params,
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
      const signed = await transfer.signAndSendMoveToHydration(
        tx,
        account.address,
        { signer: account.signer as any, withSignedTransaction: true },
      );
      const receipt = api
        ? await withBlockNumber(api, registry.assetHubParaId, signed)
        : signed;
      setBusy(null);
      if (!receipt.success) {
        setError(
          `Transaction failed: ${JSON.stringify(receipt.dispatchError)}`,
        );
        return;
      }
      setLeg1FormOpen(false);
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
      topUpTouched.current = false;
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
      ? `${quoteKey}|${accelerated}|${slippageBps}|${checkBeneficiary}|${balances.hydration[leg2Symbol]}|${balances.hydrationDot}|${balances.hydrationNative}`
      : null;
  const [leg2Check, setLeg2Check] = useState<{
    key: string;
    account: string;
    errors: string[];
    warnings?: string[];
    txFee?: stables.ValidatedSwapAndBridge["data"]["txFee"];
  } | null>(null);
  // Paid in DOT, the tx fee draws on the same balance as the bridge fee.
  // The last check's fee stays shown while the next runs, but only for the same account.
  const leg2TxFee =
    leg2Check && leg2Check.account === sourceAddress
      ? (leg2Check.txFee ?? null)
      : null;
  const leg2TxFeeInDot =
    leg2TxFee?.assetId === HYDRATION_DOT_ID ? (leg2TxFee.amount ?? 0n) : 0n;
  // The SDK leaves the amount unset for a fee currency it cannot price.
  const leg2TxFeeText = leg2TxFee
    ? leg2TxFee.amount !== undefined
      ? `${formatBalance({ number: leg2TxFee.amount, decimals: leg2TxFee.decimals, displayDecimals: 6 })} ${leg2TxFee.symbol}`
      : `Paid in ${leg2TxFee.symbol}`
    : null;
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
            account: sourceAddress,
            errors: errorMessages(validated.logs),
            warnings: warningMessages(validated.logs),
            txFee: validated.data.txFee,
          });
      } catch (err) {
        if (!cancelled)
          setLeg2Check({
            key: leg2CheckKey,
            account: sourceAddress,
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
        message: "Checking the latest fees...",
      });
      const latestFee = await transfer.swapAndBridgeFee(target, {
        accelerated,
        volumeFee: await leg2VolumeFee(leg2Symbol, quote.amountIn),
      });
      const shownDot = dotTotal(fee);
      const latestDot = dotTotal(latestFee);
      if (latestDot * 100n > shownDot * (100n + FEE_RISE_TOLERANCE_PERCENT)) {
        setQuoted((prev) =>
          prev && prev.key === quoteKey
            ? {
                ...prev,
                fees: {
                  ...prev.fees,
                  [accelerated ? "accelerated" : "normal"]: latestFee,
                },
              }
            : prev,
        );
        setBusy(null);
        setError(
          `The fee went up from ${formatBalance({ number: shownDot, decimals: DOT_DECIMALS, displayDecimals: 4 })} to ${formatBalance({ number: latestDot, decimals: DOT_DECIMALS, displayDecimals: 4 })} DOT since it was quoted, as Ethereum gas rose. The page now shows the new fee; check it and send again.`,
        );
        return;
      }
      setBusy({
        title: "Swap and send to Ethereum",
        message:
          "Dry running on Hydration, Polkadot Hub, Bridge Hub and Ethereum...",
      });
      // The fresh fee, so the relayer reward matches current Ethereum gas.
      const tx = await transfer.swapAndBridgeTx(
        account.address,
        beneficiary,
        quote,
        slippageBps,
        latestFee,
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
      const signed = await transfer.signAndSendSwapAndBridge(
        tx,
        account.address,
        { signer: account.signer as any, withSignedTransaction: true },
      );
      const receipt = api
        ? await withBlockNumber(api, stables.HYDRATION_PARA_ID, signed)
        : signed;
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
          block_num: receipt.blockNumber ?? 0,
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
  const leg1ServiceLoading = sendsLeg1 && leg1ServiceFee === null;
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

  const percentPills = (balance: bigint | null, set: (v: bigint) => void) => (
    <div className="flex items-center justify-end gap-1">
      {[25, 50, 75, 100].map((percent) => (
        <Button
          key={percent}
          type="button"
          variant="clean"
          className="h-6 px-2 py-0.5 text-xs rounded-full border-0 glass-pill"
          disabled={balance === null || balance === 0n}
          onClick={() =>
            balance !== null && set((balance * BigInt(percent)) / 100n)
          }
        >
          {percent === 100 ? "Max" : `${percent}%`}
        </Button>
      ))}
    </div>
  );
  const setLeg1Value = (value: bigint) => {
    const display = displayAmount(value, leg1Stable.decimals);
    setLeg1Exact({ symbol: leg1Symbol, display, value });
    setLeg1Amount(display);
  };
  const setLeg2Value = (value: bigint) => {
    const display = displayAmount(value, leg2Stable.decimals);
    setLeg2Exact({ symbol: leg2Symbol, display, value });
    setLeg2Amount(display);
  };

  const summaryRow = (label: ReactNode, value: ReactNode) => (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-glass">{label}</dt>
      <dd className="text-primary text-right">{value}</dd>
    </div>
  );

  // The total, with the per-chain lines behind a toggle as on /send.
  const feeSummary = (
    total: ReactNode,
    items: [string, ReactNode][],
    rows: ReactNode,
  ) => (
    <dl className="glass-sub p-4 space-y-2 card-shadow">
      {summaryRow(
        <span className="flex items-center gap-1 text-left">
          <span>Total fee</span>
          <button
            type="button"
            className="text-xs underline underline-offset-2 hover:text-primary"
            onClick={() => setFeeBreakdownOpen((open) => !open)}
            aria-expanded={feeBreakdownOpen}
          >
            {feeBreakdownOpen ? "(hide breakdown)" : "(see breakdown)"}
          </button>
        </span>,
        total,
      )}
      {feeBreakdownOpen &&
        items.map(([label, value]) => (
          <Fragment key={label}>{summaryRow(label, value)}</Fragment>
        ))}
      {rows}
    </dl>
  );

  const pills = <V extends string | boolean>(
    options: { label: string; value: V }[],
    value: V,
    onChange: (v: V) => void,
  ) => (
    <span className="inline-flex gap-1">
      {options.map((o) => (
        <Button
          key={o.label}
          type="button"
          variant="clean"
          // hover:!transform-none: overrides.css rotates round buttons in .glass-sub on hover.
          className={`h-6 px-2 py-0.5 text-xs rounded-full border-0 glass-pill hover:!transform-none ${
            value === o.value
              ? "font-semibold cursor-default"
              : "opacity-60 hover:opacity-100 transition-opacity"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </span>
  );

  const usdOf = (amount: bigint, decimals: number, symbol: string) => {
    const price =
      prices[symbol.toUpperCase()] ?? (PEGGED.has(symbol) ? 1 : undefined);
    return price === undefined
      ? undefined
      : Number(formatUnits(amount, decimals)) * price;
  };
  // A DOT total with its dollar value; `other` is a fee in another asset, folded
  // into the dollar value when it can be priced and listed otherwise.
  const feeTotal = (
    dot: bigint,
    other?: { amount: bigint; decimals: number; symbol: string },
  ) => {
    const dotUsd = usdOf(dot, DOT_DECIMALS, "DOT");
    const otherUsd = other
      ? usdOf(other.amount, other.decimals, other.symbol)
      : 0;
    // Every token charged is listed; the dollar value is shown only when all are priced.
    const text = other
      ? `${fmt(dot, DOT_DECIMALS)} DOT + ${fmtFee(other.amount, other.decimals)} ${other.symbol}`
      : `${fmt(dot, DOT_DECIMALS)} DOT`;
    return dotUsd !== undefined && otherUsd !== undefined
      ? `${text} (${formatUsdValue(dotUsd + otherUsd)})`
      : text;
  };

  // With no stable to send, the top-up is the whole transfer.
  const topUpVerb = leg1AmountParsed ? "Also send" : "Send only";
  // Inputs that cannot be read block the step; they are never treated as zero.
  const leg1InputErrors = [
    ...(isInvalidAmount(leg1Amount, leg1Stable.decimals)
      ? [
          `Enter a valid ${leg1Symbol} amount, with at most ${leg1Stable.decimals} decimals.`,
        ]
      : []),
    ...(topUpEnabled && isInvalidAmount(topUpAmount, DOT_DECIMALS)
      ? [`Enter a valid DOT amount, with at most ${DOT_DECIMALS} decimals.`]
      : []),
  ];
  const leg2InputErrors = isInvalidAmount(leg2Amount, leg2Stable.decimals)
    ? [
        `Enter a valid ${leg2Symbol} amount, with at most ${leg2Stable.decimals} decimals.`,
      ]
    : [];
  // Max leaves the tx fee when Hydration charges it in the stable being swapped.
  const leg2FeeInSource =
    leg2TxFee?.assetId === leg2Stable.hydrationAssetId
      ? (leg2TxFee.amount ?? 0n)
      : 0n;
  const setLeg2Percent = (value: bigint) =>
    setLeg2Value(
      value === leg2Balance && value > leg2FeeInSource
        ? value - leg2FeeInSource
        : value,
    );
  const leg1Checking = (!!leg1CheckKey && !leg1Checked) || leg1ServiceLoading;
  const leg2Checking = !!leg2CheckKey && !leg2Checked;
  const leg1FeeTotal =
    leg1NetworkFees && leg1ServiceFee !== null
      ? feeTotal(
          leg1AssetHubFee +
            leg1ServiceFee +
            (leg1NetworkFees.hydrationDotExecution ?? 0n),
          leg1NetworkFees.hydrationExecution !== undefined
            ? {
                amount: leg1NetworkFees.hydrationExecution,
                decimals: leg1Stable.decimals,
                symbol: leg1Symbol,
              }
            : undefined,
        )
      : pending(leg1Loading || leg1ServiceLoading);
  const leg2FeeTotal =
    dotFee !== null
      ? feeTotal(
          dotFee + leg2TxFeeInDot,
          leg2TxFee?.amount !== undefined && leg2TxFeeInDot === 0n
            ? {
                amount: leg2TxFee.amount,
                decimals: leg2TxFee.decimals,
                symbol: leg2TxFee.symbol,
              }
            : undefined,
        )
      : pending(leg2QuoteLoading);
  const surplus =
    quote && minReceived !== null ? quote.amountOut - minReceived : 0n;
  // Step 2 is short of DOT on Hydration: size a top-up and send the user to step 1.
  const sendDotForStep2 = async () => {
    // Sized from the step 2 fee, which has the volume fee for this amount.
    let topUp = roundUpToTenthDot(
      (leg2DotShortfall * (100n + TOP_UP_PAD_PERCENT)) / 100n,
    );
    const forAccount = sourceAddress;
    if (transfer && fee && sourceAddress) {
      try {
        const suggested = await suggestTopUp(
          transfer,
          sourceAddress,
          fee,
          leg2TxFeeInDot > 0n ? leg2TxFeeInDot : STEP2_TX_FEE_BUFFER,
        );
        if (suggested > 0n) topUp = suggested;
      } catch (err) {
        console.error("Could not size the DOT top-up:", err);
      }
    }
    // The estimate is for the account selected when it started.
    if (sourceAddressRef.current !== forAccount) return;
    setStep(1);
    setLeg1FormOpen(true);
    setTopUpEnabled(true);
    topUpTouched.current = true;
    topUpEdited.current = true;
    setTopUpAmount(formatUnits(topUp, DOT_DECIMALS));
    // Send only DOT; the stable is already on Hydration.
    leg1Prefilled.current = `${sourceAddress}|${leg1Symbol}`;
    setLeg1Amount("");
  };
  const leg2Shortfall =
    leg2DotShortfall > 0n && balances && dotFee !== null
      ? `You need ${fmt(dotFee + leg2TxFeeInDot, DOT_DECIMALS)} DOT on Hydration and have ${fmt(balances.hydrationDot, DOT_DECIMALS)}.`
      : null;

  const routeChain = (image: string, label: string) => (
    // Styled like /send's chain selects, which get their radius from button[role="combobox"].
    <div className="fake-dropdown flex-1 min-w-0 flex h-10 items-center rounded-[15px] dropdown-shadow">
      <SelectItemWithIcon
        label={label}
        image={image}
        altImage="parachain_generic"
      />
    </div>
  );

  return (
    <Card className="w-full max-w-[min(42rem,calc(100vw-2rem))] glass border-white/60">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Step {step} of 2</span>
          <button
            type="button"
            className="underline underline-offset-2 hover:text-primary"
            onClick={() => setStep(step === 1 ? 2 : 1)}
          >
            {step === 1
              ? "Already on Hydration? Go to step 2"
              : "Back to step 1"}
          </button>
        </div>
        <div className="flex flex-row items-center justify-between gap-1 sm:gap-3">
          {step === 1
            ? routeChain(`polkadot_${registry.assetHubParaId}`, "Polkadot Hub")
            : routeChain(`polkadot_${stables.HYDRATION_PARA_ID}`, "Hydration")}
          <div className="rounded-full bg-white/[0.28] p-1.5 sm:p-2 flex-shrink-0">
            <LucideArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          {step === 1
            ? routeChain(`polkadot_${stables.HYDRATION_PARA_ID}`, "Hydration")
            : routeChain(`ethereum_${registry.ethChainId}`, "Ethereum")}
        </div>
        <p className="text-sm text-muted-foreground">
          {step === 1
            ? "Bridge your stables from Polkadot Hub to Hydration."
            : "Swap your stables on Hydration for USDT or USDC and send them to Ethereum."}
        </p>

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
                    <dd>Polkadot Hub → Hydration</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="opacity-70">Polkadot Hub block</dt>
                    <dd>
                      <a
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                        href={subscanExtrinsicLink(
                          registry.environment,
                          `polkadot_${registry.assetHubParaId}`,
                          pendingLeg1.receipt.blockNumber !== undefined
                            ? `${pendingLeg1.receipt.blockNumber}-${pendingLeg1.receipt.txIndex}`
                            : pendingLeg1.receipt.txHash,
                        )}
                      >
                        {pendingLeg1.receipt.blockNumber !== undefined
                          ? `#${pendingLeg1.receipt.blockNumber}`
                          : trimAccount(pendingLeg1.receipt.txHash, 16)}
                      </a>
                    </dd>
                  </div>
                </dl>
                {!leg1FormOpen && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {pendingLeg1.status === "received" && (
                      <button
                        type="button"
                        className="underline font-medium"
                        onClick={() => setStep(2)}
                      >
                        Continue to step 2
                      </button>
                    )}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => {
                        // A finished transfer's card goes; one in flight stays to be tracked.
                        if (pendingLeg1.status !== "pending")
                          setPendingLeg1(null);
                        setLeg1FormOpen(true);
                      }}
                    >
                      Send more
                    </button>
                  </div>
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

            {/* Once sent, the form stays hidden until "Send more". */}
            {(!pendingLeg1 || leg1FormOpen) && (
              <>
                <div className="amountContainer flex flex-col w-full px-3 py-3 gap-2">
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Send from Polkadot Hub</span>
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
                      onChange={(e) => {
                        setLeg1Exact(null);
                        setLeg1Amount(e.target.value);
                      }}
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
                  {percentPills(leg1Balance, setLeg1Value)}
                </div>

                <div className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md glass-sub text-primary">
                  <input
                    id="topUp"
                    type="checkbox"
                    className="accent-primary w-4 h-4 rounded focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
                    checked={topUpEnabled}
                    onChange={(e) => {
                      topUpTouched.current = true;
                      setTopUpEnabled(e.target.checked);
                    }}
                  />
                  <Label
                    htmlFor="topUp"
                    // Overrides the global small-caps label style, which stretches a sentence.
                    className="!text-sm !normal-case !tracking-normal !text-primary !font-normal cursor-pointer select-none"
                  >
                    {topUpEnabled
                      ? topUpVerb
                      : `${topUpVerb} DOT for step 2 fees`}
                  </Label>
                  {topUpEnabled && (
                    <>
                      <input
                        aria-label="DOT amount to send to Hydration"
                        inputMode="decimal"
                        // A visible field: the row behind it has the same glass background.
                        className="amountInput w-24 rounded-md border border-slate-300 dark:border-slate-600 !bg-white dark:!bg-slate-900 !px-2 py-1 text-right text-sm !text-primary outline-none focus:ring-1 focus:ring-primary"
                        value={topUpAmount}
                        onChange={(e) => {
                          topUpEdited.current = true;
                          setTopUpAmount(e.target.value);
                        }}
                        placeholder="0.0"
                      />
                      <span>DOT for step 2 fees</span>
                    </>
                  )}
                </div>
                {feeSummary(
                  leg1FeeTotal,
                  [
                    [
                      "Polkadot Hub fee",
                      leg1NetworkFees
                        ? `${fmtFee(leg1AssetHubFee, DOT_DECIMALS)} DOT${
                            leg1NetworkFees.assetHubDelivery === undefined
                              ? " + delivery"
                              : ""
                          }`
                        : pending(leg1Loading),
                    ],
                    [
                      "Hydration fee",
                      leg1HydrationFeeText ?? pending(leg1Loading),
                    ],
                    [
                      "Service fee",
                      leg1ServiceFee !== null && sendsLeg1
                        ? `${fmt(leg1ServiceFee, DOT_DECIMALS)} DOT`
                        : pending(leg1ServiceLoading),
                    ],
                  ],
                  topUpEnabled &&
                    summaryRow(
                      "Step 2 delivery",
                      pills(DELIVERY_OPTIONS, accelerated, (value) => {
                        // A new mode needs a new amount; re-apply the suggestion.
                        topUpEdited.current = false;
                        setAccelerated(value);
                      }),
                    ),
                )}

                <StatusAlert
                  errors={[
                    ...leg1InputErrors,
                    ...(balancesError && !balances ? [balancesError] : []),
                    // Only while no fee is known; a failed refresh keeps the last one.
                    ...(leg1FeeError && leg1ServiceFee === null
                      ? [leg1FeeError]
                      : []),
                    // A check of the readable inputs alone would be misleading.
                    ...(leg1InputErrors.length === 0
                      ? (leg1Checked?.errors ?? [])
                      : []),
                  ]}
                />

                {substrateAccounts.length === 0 ? (
                  <ConnectPolkadotWalletButton variant="default" />
                ) : (
                  <Button
                    className="w-full action-button"
                    onClick={submitLeg1}
                    disabled={
                      !transfer ||
                      !account ||
                      leg1InputErrors.length > 0 ||
                      (!leg1AmountParsed && dotTopUp === 0n) ||
                      leg1ServiceFee === null ||
                      !leg1Checked ||
                      leg1Checked.errors.length > 0
                    }
                  >
                    {leg1Checking ? "Checking..." : "Send to Hydration"}
                  </Button>
                )}
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
                  onChange={(e) => {
                    setLeg2Exact(null);
                    setLeg2Amount(e.target.value);
                  }}
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
              {percentPills(leg2Balance, setLeg2Percent)}
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
                      ? displayAmount(minReceived, quote.to.decimals)
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

            {feeSummary(
              leg2FeeTotal,
              [
                [
                  "Bridge fee",
                  dotFee !== null
                    ? `${fmt(dotFee - leg2ServiceFee, DOT_DECIMALS)} DOT`
                    : pending(leg2QuoteLoading),
                ],
                [
                  "Service fee",
                  fee
                    ? `${fmt(leg2ServiceFee, DOT_DECIMALS)} DOT`
                    : pending(leg2QuoteLoading),
                ],
                [
                  "Hydration tx fee",
                  leg2TxFeeText ??
                    pending(!!leg2AmountParsed && leg2TxFeeLoading),
                ],
              ],
              <>
                {summaryRow(
                  "Delivery",
                  pills(DELIVERY_OPTIONS, accelerated, setAccelerated),
                )}
                {summaryRow(
                  "Max slippage",
                  pills(
                    ["0.1", "0.5", "1"].map((v) => ({
                      label: `${v}%`,
                      value: v,
                    })),
                    slippage,
                    setSlippage,
                  ),
                )}
                {quote &&
                  surplus > 0n &&
                  summaryRow(
                    "Stays on Hydration",
                    <span
                      className="inline-flex items-center gap-1 cursor-help"
                      title={`The swap sells the full amount but bridges only the minimum after slippage, so up to ${fmtFee(surplus, quote.to.decimals)} ${target} stays in your Hydration account.`}
                    >
                      <LucideInfo className="w-3.5 h-3.5 text-muted-foreground" />
                      up to {fmtFee(surplus, quote.to.decimals)} {target}
                    </span>,
                  )}
              </>,
            )}

            <StatusAlert
              errors={[
                ...leg2InputErrors,
                ...(balancesError && !balances ? [balancesError] : []),
                ...(quoteError ? [quoteError] : []),
                ...(leg2Checked?.errors ?? []).filter(
                  (e) =>
                    !(
                      leg2Shortfall &&
                      e.startsWith("Insufficient DOT on Hydration")
                    ),
                ),
                ...(leg2Shortfall ? [leg2Shortfall] : []),
              ]}
              warnings={leg2Checked?.warnings}
              action={
                leg2Shortfall
                  ? {
                      label: "Send DOT to Hydration →",
                      onClick: sendDotForStep2,
                    }
                  : undefined
              }
            />

            {substrateAccounts.length === 0 ? (
              <ConnectPolkadotWalletButton variant="default" />
            ) : beneficiaries.length === 0 ? (
              <ConnectEthereumWalletButton
                variant="default"
                networkId={registry.ethChainId}
              />
            ) : (
              <Button
                className="w-full action-button"
                onClick={submitLeg2}
                disabled={
                  !transfer ||
                  !account ||
                  !quote ||
                  !fee ||
                  slippageBps === null ||
                  leg2InputErrors.length > 0 ||
                  !beneficiaryValid ||
                  leg1InFlight ||
                  !leg2Checked ||
                  leg2Checked.errors.length > 0
                }
              >
                {leg1InFlight
                  ? "Waiting for funds on Hydration..."
                  : leg2QuoteLoading
                    ? "Getting quote..."
                    : leg2Checking
                      ? "Checking..."
                      : !beneficiaryValid
                        ? "Choose a beneficiary"
                        : "Swap and send to Ethereum"}
              </Button>
            )}
          </>
        )}
      </CardContent>

      <PolkadotAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        accounts={substrateAccounts}
        selected={sourceAddress}
        onSelect={(a) => {
          setSourceAddress(a.address);
          setLeg1Exact(null);
          setLeg2Exact(null);
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
