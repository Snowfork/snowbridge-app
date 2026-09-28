"use client";

import {
  FC,
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
import { historyV2, stables, toEthereumV2 } from "@snowbridge/api";
import { BridgeInfoContext } from "@/app/providers";
import { snowbridgeApiAtom } from "@/store/snowbridge";
import { ethereumAccountAtom } from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import { transfersPendingLocalAtom } from "@/store/transferActivity";
import { useTransferActivity } from "@/hooks/useTransferActivity";
import { BusyDialog } from "@/components/BusyDialog";
import { ErrorDialog } from "@/components/ErrorDialog";
import { SelectedPolkadotAccount } from "@/components/SelectedPolkadotAccount";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBalance } from "@/utils/formatting";
import { subscanExtrinsicLink } from "@/lib/explorerLinks";
import { errorMessage } from "@/utils/errorMessage";

const HYDRATION_SS58 = 0;
const DOT_DECIMALS = 10;
const HDX_DECIMALS = 12;
const SOURCE_SYMBOLS = Object.keys(
  stables.HYDRATION_STABLES,
) as stables.HydrationStableSymbol[];
const TARGET_SYMBOLS = Object.keys(
  stables.ETHEREUM_STABLES,
) as stables.EthereumStableSymbol[];

const DELIVERY_POLL_MS = 6_000;
const DELIVERY_TIMEOUT_MS = 180_000;

type Busy = { title: string; message: string } | null;

type PendingLeg1 = {
  account: string;
  symbol: stables.HydrationStableSymbol;
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

const StableSelect: FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const StablesTransferForm: FC = () => {
  const api = useAtomValue(snowbridgeApiAtom);
  const { registry } = useContext(BridgeInfoContext)!;
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const selectedPolkadotAccount = useAtomValue(polkadotAccountAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
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
      if (id === balancesRequest.current) setBalancesError(errorMessage(err));
      return null;
    }
  }, [transfer, sourceAddress]);
  useEffect(() => {
    setBalances(null);
    loadBalances();
  }, [loadBalances]);

  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const [leg1Symbol, setLeg1Symbol] =
    useState<stables.HydrationStableSymbol>("HOLLAR");
  const leg1Stable = stables.HYDRATION_STABLES[leg1Symbol];
  const [leg1Amount, setLeg1Amount] = useState("");
  const [pendingLeg1, setPendingLeg1] = useState<PendingLeg1 | null>(null);
  useEffect(() => {
    if (balances && leg1Amount === "" && balances.assetHub[leg1Symbol] > 0n) {
      setLeg1Amount(
        formatUnits(balances.assetHub[leg1Symbol], leg1Stable.decimals),
      );
    }
  }, [balances, leg1Amount, leg1Symbol, leg1Stable.decimals]);

  const [leg2Symbol, setLeg2Symbol] =
    useState<stables.HydrationStableSymbol>("HOLLAR");
  const leg2Stable = stables.HYDRATION_STABLES[leg2Symbol];
  const [leg2Amount, setLeg2Amount] = useState("");
  const [target, setTarget] = useState<stables.EthereumStableSymbol>("USDT");
  const [beneficiary, setBeneficiary] = useState(ethereumAccount ?? "");
  const [slippage, setSlippage] = useState("0.5");
  const [quoteError, setQuoteError] = useState<string | null>(null);
  useEffect(() => {
    if (!beneficiary && ethereumAccount) setBeneficiary(ethereumAccount);
  }, [ethereumAccount, beneficiary]);
  const leg1InFlight = pendingLeg1?.status === "pending";
  useEffect(() => {
    if (
      !leg1InFlight &&
      balances &&
      leg2Amount === "" &&
      balances.hydration[leg2Symbol] > 0n
    ) {
      setLeg2Amount(
        formatUnits(balances.hydration[leg2Symbol], leg2Stable.decimals),
      );
    }
  }, [leg1InFlight, balances, leg2Amount, leg2Symbol, leg2Stable.decimals]);

  // Poll until leg 1 lands, then fill step 2 with the amount received.
  useEffect(() => {
    if (!pendingLeg1 || pendingLeg1.status !== "pending") return;
    if (pendingLeg1.account !== sourceAddress) return;
    const poll = async () => {
      const latest = await loadBalances();
      if (!latest) return;
      const now = latest.hydration[pendingLeg1.symbol];
      if (now > pendingLeg1.hydrationBefore) {
        const received = now - pendingLeg1.hydrationBefore;
        setPendingLeg1({ ...pendingLeg1, status: "received", received });
        if (leg2Symbol === pendingLeg1.symbol) {
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
      ? `${sourceAddress}|${leg2Symbol}|${target}|${leg2AmountParsed}`
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
        const [q, f] = await Promise.all([
          transfer.quote(sourceAddress, leg2Symbol, target, leg2AmountParsed),
          transfer.swapAndBridgeFee(target),
        ]);
        if (cancelled) return;
        setQuoted({ key: quoteKey, quote: q, fee: f });
      } catch (err) {
        if (cancelled) return;
        setQuoteError(errorMessage(err));
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [transfer, sourceAddress, leg2AmountParsed, leg2Symbol, target, quoteKey]);

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

  const submitLeg1 = async () => {
    if (!transfer || !account) return;
    const amount = parseAmount(leg1Amount, leg1Stable.decimals);
    if (!amount) {
      setError(`Enter a valid ${leg1Symbol} amount.`);
      return;
    }
    try {
      setBusy({
        title: "Move to Hydration",
        message: "Dry running on Asset Hub and Hydration...",
      });
      const tx = await transfer.moveToHydrationTx(
        account.address,
        leg1Symbol,
        amount,
      );
      const validated = await transfer.validateMoveToHydration(tx);
      if (!validated.success) {
        setBusy(null);
        setError(describeLogs(validated.logs, validated.data));
        return;
      }
      const hydrationBefore = (await transfer.balances(account.address))
        .hydration[leg1Symbol];
      setBusy({
        title: "Move to Hydration",
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
        hydrationBefore,
        receipt,
        deadline: Date.now() + DELIVERY_TIMEOUT_MS,
        status: "pending",
      });
      setLeg2Symbol(leg1Symbol);
      setLeg2Amount("");
      loadBalances();
    } catch (err) {
      setBusy(null);
      setError(errorMessage(err));
    }
  };

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

  return (
    <Card className="w-auto md:w-2/3 glass more-blur">
      <CardHeader>
        <CardTitle>Stables to Ethereum via Hydration</CardTitle>
        <CardDescription>
          Two signatures: move a stablecoin from Asset Hub to Hydration, then
          swap it to Ethereum USDT or USDC on Hydration and bridge it to
          Ethereum in one transaction. Every step is dry run before you sign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Polkadot account</Label>
          {polkadotAccounts && polkadotAccounts.length > 0 ? (
            <SelectedPolkadotAccount
              ss58Format={HYDRATION_SS58}
              polkadotAccounts={polkadotAccounts}
              polkadotAccount={sourceAddress}
              onValueChange={(address) => {
                setSourceAddress(address);
                setLeg1Amount("");
                setLeg2Amount("");
                setPendingLeg1(null);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Connect a Polkadot wallet from the menu to continue.
            </p>
          )}
        </div>

        {balancesError && (
          <p className="text-sm text-destructive">{balancesError}</p>
        )}
        {balances && (
          <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-sm glass-sub rounded-xl p-3">
            <div className="text-muted-foreground" />
            <div className="text-right text-muted-foreground">Asset Hub</div>
            <div className="text-right text-muted-foreground">Hydration</div>
            {SOURCE_SYMBOLS.map((s) => (
              <>
                <div key={`${s}-label`}>{s}</div>
                <div key={`${s}-ah`} className="text-right font-mono">
                  {fmt(
                    balances.assetHub[s],
                    stables.HYDRATION_STABLES[s].decimals,
                  )}
                </div>
                <div key={`${s}-hy`} className="text-right font-mono">
                  {fmt(
                    balances.hydration[s],
                    stables.HYDRATION_STABLES[s].decimals,
                  )}
                </div>
              </>
            ))}
            <div>DOT (fees)</div>
            <div className="text-right font-mono">
              {fmt(balances.assetHubDot, DOT_DECIMALS)}
            </div>
            <div className="text-right font-mono">
              {fmt(balances.hydrationDot, DOT_DECIMALS)}
            </div>
            <div>HDX (Hydration tx fee)</div>
            <div />
            <div className="text-right font-mono">
              {fmt(balances.hydrationNative, HDX_DECIMALS)}
            </div>
          </div>
        )}

        <section className="space-y-3">
          <h3 className="font-medium">
            Step 1: Move a stablecoin from Asset Hub to Hydration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div className="space-y-1">
              <Label>Stablecoin</Label>
              <StableSelect
                value={leg1Symbol}
                onChange={(v) => {
                  setLeg1Symbol(v as stables.HydrationStableSymbol);
                  setLeg1Amount("");
                }}
                options={SOURCE_SYMBOLS.map((s) => ({
                  value: s,
                  label: stables.HYDRATION_STABLES[s].name,
                }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="leg1Amount">Amount ({leg1Symbol})</Label>
              <Input
                id="leg1Amount"
                value={leg1Amount}
                onChange={(e) => setLeg1Amount(e.target.value)}
                placeholder="0.0"
              />
            </div>
            <Button
              onClick={submitLeg1}
              disabled={
                !transfer ||
                !account ||
                !parseAmount(leg1Amount, leg1Stable.decimals)
              }
            >
              Move to Hydration
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Skip this step if the stablecoin is already on Hydration. Hydration
            execution is paid in the stablecoin, the Asset Hub fee in DOT.
          </p>
          {pendingLeg1 && (
            <div className="text-xs break-all space-y-1">
              <p>
                Sent in Asset Hub block {pendingLeg1.receipt.blockNumber}.{" "}
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
                  View on Subscan
                </a>
              </p>
              {pendingLeg1.status === "pending" && (
                <p>Waiting for Hydration to receive the funds...</p>
              )}
              {pendingLeg1.status === "received" &&
                pendingLeg1.received !== undefined && (
                  <p>
                    Received{" "}
                    {fmt(
                      pendingLeg1.received,
                      stables.HYDRATION_STABLES[pendingLeg1.symbol].decimals,
                    )}{" "}
                    {pendingLeg1.symbol} on Hydration. Step 2 is filled in with
                    this amount.
                  </p>
                )}
              {pendingLeg1.status === "timeout" && (
                <p className="text-destructive">
                  Hydration has not received the funds yet. Check the transfer
                  on Subscan before retrying.{" "}
                  <button
                    className="underline"
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
        </section>

        <section className="space-y-3">
          <h3 className="font-medium">
            Step 2: Swap on Hydration and send to Ethereum
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>Swap from</Label>
              <StableSelect
                value={leg2Symbol}
                onChange={(v) => {
                  setLeg2Symbol(v as stables.HydrationStableSymbol);
                  setLeg2Amount("");
                }}
                options={SOURCE_SYMBOLS.map((s) => ({
                  value: s,
                  label: stables.HYDRATION_STABLES[s].name,
                }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="leg2Amount">Amount ({leg2Symbol})</Label>
              <Input
                id="leg2Amount"
                value={leg2Amount}
                onChange={(e) => setLeg2Amount(e.target.value)}
                placeholder="0.0"
              />
            </div>
            <div className="space-y-1">
              <Label>Receive on Ethereum</Label>
              <StableSelect
                value={target}
                onChange={(v) => setTarget(v as stables.EthereumStableSymbol)}
                options={TARGET_SYMBOLS.map((s) => ({ value: s, label: s }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="beneficiary">Ethereum beneficiary</Label>
              <Input
                id="beneficiary"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slippage">Max slippage (%)</Label>
              <Input
                id="slippage"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
              />
            </div>
          </div>

          {quoteError && (
            <p className="text-sm text-destructive">{quoteError}</p>
          )}
          {quote && minReceived !== null && (
            <div className="grid grid-cols-2 gap-1 text-sm glass-sub rounded-xl p-3">
              <div>Quoted</div>
              <div className="text-right font-mono">
                {formatUnits(quote.amountOut, quote.to.decimals)} {target}
              </div>
              <div>Minimum sent to Ethereum</div>
              <div className="text-right font-mono">
                {formatUnits(minReceived, quote.to.decimals)} {target}
              </div>
              <div>Bridge fee (paid in DOT on Hydration)</div>
              <div className="text-right font-mono">
                {dotFee !== null ? fmt(dotFee, DOT_DECIMALS) : "..."} DOT
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            The swap and the bridge transfer run in one batch. Exactly the
            minimum amount is bridged; anything the swap returns above it stays
            in your Hydration account.
          </p>
          <Button
            onClick={submitLeg2}
            disabled={
              !transfer ||
              !account ||
              !quote ||
              !fee ||
              slippageBps === null ||
              !beneficiary
            }
          >
            Swap and send to Ethereum
          </Button>
        </section>
      </CardContent>

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
