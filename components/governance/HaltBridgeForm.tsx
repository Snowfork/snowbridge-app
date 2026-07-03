"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { governance } from "@snowbridge/api";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Button } from "@/components/ui/button";
import { xxhashAsHex } from "@polkadot/util-crypto";
import {
  LucideSlidersHorizontal,
  LucideShieldCheck,
  LucideListChecks,
  LucideCheck,
} from "lucide-react";

// Public RPC for Polkadot Collectives Chain, used to construct the
// fellowshipReferenda.submit call (the Whitelist origin lives there).
const COLLECTIVES_WS = "wss://polkadot-collectives-rpc.polkadot.io";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { BridgeInfoContext } from "@/app/providers";

type Operation = "halt" | "resume";

// Per-lever UI keys, operation-agnostic. toSdkOption() below converts each to
// the right SDK option name for the chosen operation (the halt and resume
// option shapes overlap except for the fee fields).
type LeverKey =
  | "all"
  | "gateway"
  | "gatewayV1"
  | "gatewayV2"
  | "inboundQueue"
  | "inboundQueueV1"
  | "inboundQueueV2"
  | "outboundQueue"
  | "outboundQueueV1"
  | "systemFrontend"
  | "ethereumClient"
  | "ahFee"
  | "ahFeeV1"
  | "ahFeeV2";

interface LeverDescriptor {
  key: LeverKey;
  label: string;
  haltDescription: string;
  resumeDescription: string;
}

const ADVANCED_GROUPS: { title: string; levers: LeverDescriptor[] }[] = [
  {
    title: "Catch-all",
    levers: [
      {
        key: "all",
        label: "Everything",
        haltDescription:
          "Equivalent to ticking every other box. Halts both V1 and V2, both directions.",
        resumeDescription:
          "Equivalent to ticking every other box. Resumes both V1 and V2, both directions, restores prod fees.",
      },
    ],
  },
  {
    title: "Gateway (Ethereum side)",
    levers: [
      {
        key: "gateway",
        label: "Gateway (V1 + V2)",
        haltDescription:
          "SetOperatingMode on the Ethereum Gateway via both V1 and V2 system pallets.",
        resumeDescription:
          "Restore Normal operating mode on the Gateway via both V1 and V2 system pallets.",
      },
      {
        key: "gatewayV1",
        label: "Gateway V1 only",
        haltDescription:
          "Blocks V1 sendToken / sendMessage on the Gateway. V2 continues.",
        resumeDescription: "Restores V1 send on the Gateway. V2 unaffected.",
      },
      {
        key: "gatewayV2",
        label: "Gateway V2 only",
        haltDescription:
          "Blocks v2_sendMessage / v2_registerToken on the Gateway. V1 continues.",
        resumeDescription: "Restores V2 send on the Gateway. V1 unaffected.",
      },
    ],
  },
  {
    title: "Inbound (Ethereum → Polkadot)",
    levers: [
      {
        key: "inboundQueue",
        label: "Inbound queue (V1 + V2)",
        haltDescription: "Blocks Ethereum → Polkadot for both V1 and V2.",
        resumeDescription: "Resumes Ethereum → Polkadot for both V1 and V2.",
      },
      {
        key: "inboundQueueV1",
        label: "Inbound queue V1 only",
        haltDescription: "Blocks V1 Ethereum → Polkadot. V2 inbound continues.",
        resumeDescription: "Resumes V1 Ethereum → Polkadot. V2 unaffected.",
      },
      {
        key: "inboundQueueV2",
        label: "Inbound queue V2 only",
        haltDescription: "Blocks V2 Ethereum → Polkadot. V1 inbound continues.",
        resumeDescription: "Resumes V2 Ethereum → Polkadot. V1 unaffected.",
      },
    ],
  },
  {
    title: "Outbound (Polkadot → Ethereum)",
    levers: [
      {
        key: "outboundQueue",
        label: "Outbound queue + AH frontend",
        haltDescription:
          "Halts V1 outbound-queue on BridgeHub AND AssetHub system-frontend (router-layer block for V1 and V2).",
        resumeDescription:
          "Resumes V1 outbound-queue on BridgeHub AND AssetHub system-frontend.",
      },
      {
        key: "outboundQueueV1",
        label: "BH outbound-queue V1 only",
        haltDescription:
          "Halts V1 outbound-queue on BridgeHub only. V2 P→E continues; AH frontend untouched.",
        resumeDescription:
          "Resumes V1 outbound-queue on BridgeHub only. AH frontend unaffected.",
      },
      {
        key: "systemFrontend",
        label: "AH system-frontend only",
        haltDescription:
          "Router-layer P→E block (covers both V1 and V2). V1 BridgeHub outbound-queue keeps draining in-flight messages.",
        resumeDescription: "Restores router-layer P→E (covers both V1 and V2).",
      },
      {
        key: "ahFee",
        label: "AH base fee (V1 + V2)",
        haltDescription:
          "Fee deterrent: sets both BridgeHubEthereumBaseFee and BridgeHubEthereumBaseFeeV2 to u128::MAX.",
        resumeDescription:
          "Restore both BridgeHubEthereumBaseFee and BridgeHubEthereumBaseFeeV2 to their prod values.",
      },
      {
        key: "ahFeeV1",
        label: "AH base fee (V1 only)",
        haltDescription:
          "Sets only BridgeHubEthereumBaseFee to u128::MAX. V2 fee untouched.",
        resumeDescription:
          "Restore only BridgeHubEthereumBaseFee to its prod value. V2 fee untouched.",
      },
      {
        key: "ahFeeV2",
        label: "AH base fee (V2 only)",
        haltDescription:
          "Sets only BridgeHubEthereumBaseFeeV2 to u128::MAX. V1 fee untouched.",
        resumeDescription:
          "Restore only BridgeHubEthereumBaseFeeV2 to its prod value. V1 fee untouched.",
      },
    ],
  },
  {
    title: "Beacon light client",
    levers: [
      {
        key: "ethereumClient",
        label: "Ethereum beacon light client",
        haltDescription:
          "Blocks new beacon-header ingestion. Does NOT propagate into downstream proof-consuming flows; halt inbound queues separately for that.",
        resumeDescription:
          "Resumes beacon-header ingestion. Halt inbound queues are unaffected.",
      },
    ],
  },
];

// Map UI lever key + operation to the SDK option name. The two option shapes
// overlap except for the fee fields (`assethubMaxFee*` vs `assethubBaseFee*`).
function toSdkOption(key: LeverKey, op: Operation): string {
  if (key === "ahFee")
    return op === "halt" ? "assethubMaxFee" : "assethubBaseFee";
  if (key === "ahFeeV1")
    return op === "halt" ? "assethubMaxFeeV1" : "assethubBaseFeeV1";
  if (key === "ahFeeV2")
    return op === "halt" ? "assethubMaxFeeV2" : "assethubBaseFeeV2";
  return key;
}

export function HaltBridgeForm() {
  const context = useAtomValue(snowbridgeContextAtom);
  const { registry } = useContext(BridgeInfoContext)!;

  const [operation, setOperation] = useState<Operation>("halt");
  const [selected, setSelected] = useState<Partial<Record<LeverKey, boolean>>>(
    {},
  );
  // Resume-only fee override inputs. Default to the SDK's prod-captured
  // constants so the unmodified form produces a byte-identical preimage to
  // calling buildResumeBridgePreimage with no overrides. The operator can
  // edit either field at submission time if the prod policy has moved since
  // the SDK constants were last refreshed (decimal wei, no scientific
  // notation, no thousands separators).
  const [baseFeeV1Input, setBaseFeeV1Input] = useState<string>(
    governance.PROD_BASE_FEE_V1.toString(),
  );
  const [baseFeeV2Input, setBaseFeeV2Input] = useState<string>(
    governance.PROD_BASE_FEE_V2.toString(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<governance.HaltBridgePreimage | null>(
    null,
  );
  const [submissionUrls, setSubmissionUrls] =
    useState<governance.SubmissionUrls | null>(null);

  // Auto-reload once if the Snowbridge context never resolves. The shared
  // useSnowbridgeContext hook initialises lazily and has no built-in retry,
  // so a hung WS handshake leaves the form stuck on "Waiting for chain
  // connections..." indefinitely. Reloading once after 30s recovers without
  // operator intervention. Guarded via sessionStorage so we don't reload-loop
  // if the connection truly cannot be established.
  useEffect(() => {
    if (context) {
      sessionStorage.removeItem("halt-bridge-context-reload");
      return;
    }
    if (sessionStorage.getItem("halt-bridge-context-reload")) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem("halt-bridge-context-reload", "1");
      window.location.reload();
    }, 30_000);
    return () => clearTimeout(timer);
  }, [context]);

  const setOp = (op: Operation) => {
    setOperation(op);
    // Reset advanced selection when toggling op: a halt-leaning selection
    // doesn't necessarily make sense for a resume and vice versa.
    setSelected({});
    // Reset fee inputs to the SDK defaults on op toggle so the form
    // round-trips cleanly.
    setBaseFeeV1Input(governance.PROD_BASE_FEE_V1.toString());
    setBaseFeeV2Input(governance.PROD_BASE_FEE_V2.toString());
    setResult(null);
    setSubmissionUrls(null);
    setError(null);
  };

  const toggle = (key: LeverKey) => {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
    setResult(null);
    setSubmissionUrls(null);
  };

  const clearAdvanced = () => {
    setSelected({});
    setResult(null);
    setSubmissionUrls(null);
    setError(null);
  };

  const selectionCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  // Parse a decimal-wei string to bigint. Returns the parsed value or an
  // error string describing why it didn't parse.
  const parseFee = (raw: string): bigint | string => {
    const trimmed = raw.trim();
    if (!/^[0-9]+$/.test(trimmed))
      return "must be a non-negative integer (wei)";
    try {
      return BigInt(trimmed);
    } catch {
      return "could not parse as bigint";
    }
  };

  const generate = async () => {
    setError(null);
    setResult(null);
    setSubmissionUrls(null);
    if (!context) {
      setError("Snowbridge context not ready. Try again in a moment.");
      return;
    }
    setLoading(true);
    let collectives: ApiPromise | null = null;
    try {
      const assetHub = await context.parachain(registry.assetHubParaId);
      const bridgeHub = await context.parachain(registry.bridgeHubParaId);

      // If the user hasn't picked any advanced levers, default to {all: true}.
      // Otherwise translate UI keys to SDK options for the chosen operation.
      const useAll = selectionCount === 0;
      const opts: Record<string, boolean | bigint> = useAll
        ? { all: true }
        : Object.fromEntries(
            (Object.entries(selected) as [LeverKey, boolean | undefined][])
              .filter(([, v]) => !!v)
              .map(([k]) => [toSdkOption(k, operation), true]),
          );

      // For resume, attach the per-fee overrides. We always pass them so the
      // operator sees the value in the result summary and the form round-
      // trips cleanly when the defaults haven't been touched.
      if (operation === "resume") {
        const v1 = parseFee(baseFeeV1Input);
        const v2 = parseFee(baseFeeV2Input);
        if (typeof v1 === "string") {
          setError(`V1 base fee: ${v1}`);
          return;
        }
        if (typeof v2 === "string") {
          setError(`V2 base fee: ${v2}`);
          return;
        }
        opts.baseFeeV1 = v1;
        opts.baseFeeV2 = v2;
      }

      const preimage =
        operation === "halt"
          ? await governance.buildHaltBridgePreimage(
              assetHub,
              bridgeHub,
              opts as governance.HaltBridgeOptions,
            )
          : await governance.buildResumeBridgePreimage(
              assetHub,
              bridgeHub,
              opts as governance.ResumeBridgeOptions,
            );
      setResult(preimage);

      // Build submission URLs alongside the preimage. Needs a Collectives
      // connection because the Fellowship whitelist call is opened there.
      collectives = await ApiPromise.create({
        provider: new WsProvider(COLLECTIVES_WS),
      });
      const urls =
        operation === "halt"
          ? await governance.buildHaltBridgeSubmissionUrls(
              assetHub,
              collectives,
              preimage,
            )
          : await governance.buildResumeBridgeSubmissionUrls(
              assetHub,
              collectives,
              preimage,
            );
      setSubmissionUrls(urls);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (collectives) {
        await collectives.disconnect().catch(() => {});
      }
      setLoading(false);
    }
  };

  const opLabel = operation === "halt" ? "halt" : "resume";

  return (
    <div className="w-full max-w-[min(48rem,calc(100vw-2rem))] mx-auto space-y-6">
      <div className="glass rounded-3xl border border-white/60 py-8 px-6 md:py-10 md:px-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-primary">
            Governance: halt / resume bridge
          </h1>
          <p className="text-sm text-muted-foreground">
            Build a halt or resume preimage for the Whitelisted Caller track.
            Submission links open in papi.how, signed transaction in PAPI.
          </p>
        </div>

        <fieldset className="space-y-1">
          {(["halt", "resume"] as const).map((op) => (
            <label
              key={op}
              className="text-muted-foreground flex items-center gap-3 cursor-pointer rounded-xl p-2 hover:bg-white/30 transition-colors"
            >
              <input
                type="radio"
                name="governance-op"
                className="h-4 w-4 cursor-pointer accent-primary"
                checked={operation === op}
                onChange={() => setOp(op)}
              />
              <span className="font-medium text-sm text-primary">
                {op === "halt" ? "Halt bridge" : "Resume bridge"}
              </span>
            </label>
          ))}
        </fieldset>

        {operation === "resume" && (
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium text-muted-foreground mb-2">
              Base fees to restore (wei)
            </legend>
            <p className="text-xs text-muted-foreground">
              Prefilled with the SDK&apos;s prod-captured values (
              {governance.PROD_BASE_FEE_V1.toString()} V1,{" "}
              {governance.PROD_BASE_FEE_V2.toString()} V2). Override only if
              governance has changed the fee policy since the SDK constants were
              last refreshed.
            </p>
            <FeeInput
              label="V1 base fee"
              hint=":BridgeHubEthereumBaseFee: storage key value"
              defaultValue={governance.PROD_BASE_FEE_V1}
              value={baseFeeV1Input}
              onChange={(v) => {
                setBaseFeeV1Input(v);
                setResult(null);
              }}
            />
            <FeeInput
              label="V2 base fee"
              hint=":BridgeHubEthereumBaseFeeV2: storage key value"
              defaultValue={governance.PROD_BASE_FEE_V2}
              value={baseFeeV2Input}
              onChange={(v) => {
                setBaseFeeV2Input(v);
                setResult(null);
              }}
            />
          </fieldset>
        )}

        <Accordion type="single" collapsible>
          <AccordionItem
            value="advanced"
            className="border-none glass-sub rounded-2xl overflow-hidden"
          >
            <AccordionTrigger className="text-sm text-primary px-4 py-3 hover:no-underline hover:bg-white/30 transition-colors">
              <span className="flex items-center gap-2 flex-1">
                <LucideSlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Advanced options</span>
                {selectionCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {selectionCount}
                  </span>
                )}
                <span className="text-xs text-muted-foreground font-normal ml-auto mr-2">
                  {selectionCount > 0
                    ? "overrides default"
                    : "pick specific levers"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">
                Tick one or more to override the default. Nothing ticked targets
                everything. Descriptions reflect the selected operation (
                <em>{opLabel}</em>).
              </p>
              <div className="grid md:grid-cols-2 gap-6 pt-2">
                {ADVANCED_GROUPS.map((g) => (
                  <fieldset key={g.title} className="space-y-1">
                    <legend className="text-xs font-medium text-muted-foreground mb-2">
                      {g.title}
                    </legend>
                    {g.levers.map((lever) => (
                      <label
                        key={lever.key}
                        className="text-muted-foreground flex items-start gap-3 cursor-pointer rounded-xl p-2 hover:bg-white/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                          checked={!!selected[lever.key]}
                          onChange={() => toggle(lever.key)}
                        />
                        <span className="flex-1">
                          <span className="font-medium text-sm text-primary block">
                            {lever.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {operation === "halt"
                              ? lever.haltDescription
                              : lever.resumeDescription}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={generate} disabled={loading || !context}>
            {loading ? "Generating…" : `Generate ${opLabel} preimage`}
          </Button>
          {selectionCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAdvanced}>
              Clear advanced
            </Button>
          )}
          {!context && (
            <span className="text-xs text-muted-foreground">
              Waiting for chain connections…
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-2xl glass-sub p-3 text-sm text-red-600 border border-red-300/50">
            {error}
          </div>
        )}
      </div>

      {result && (
        <PreimageResult
          result={result}
          operation={operation}
          submissionUrls={submissionUrls}
        />
      )}
    </div>
  );
}

function FeeInput({
  label,
  hint,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  defaultValue: bigint;
  value: string;
  onChange: (v: string) => void;
}) {
  const isDefault = value === defaultValue.toString();
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-primary">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm font-mono rounded-xl px-3 py-2 bg-white/30 text-primary placeholder:text-muted-foreground border-0 outline-none"
        />
        {!isDefault && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(defaultValue.toString())}
          >
            Reset to default
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function PreimageResult({
  result,
  operation,
  submissionUrls,
}: {
  result: governance.HaltBridgePreimage;
  operation: Operation;
  submissionUrls: governance.SubmissionUrls | null;
}) {
  const copy = (text: string) => navigator.clipboard.writeText(text);
  const label = operation === "halt" ? "Halt" : "Resume";
  const verb = operation === "halt" ? "halts" : "resumes";
  return (
    <div className="glass rounded-3xl border border-white/60 py-8 px-6 md:py-10 md:px-10 space-y-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-primary">{label} preimage</h2>
        <span className="text-xs text-muted-foreground font-mono">
          {result.encodedSize} bytes
        </span>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem
          value="what"
          className="border-none glass-sub rounded-2xl overflow-hidden"
        >
          <AccordionTrigger className="text-sm text-primary px-4 py-3 hover:no-underline hover:bg-white/30 transition-colors">
            <span className="flex items-center gap-2 flex-1">
              <LucideListChecks className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">What this {verb}</span>
              <span className="text-xs text-muted-foreground font-normal ml-auto mr-2">
                {result.summary.length} action
                {result.summary.length === 1 ? "" : "s"}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ul className="space-y-1 text-sm text-primary">
              {result.summary.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary/40 select-none">•</span>
                  <span className="flex-1">{s}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {submissionUrls && <SubmissionLinks urls={submissionUrls} />}

      <div className="space-y-3">
        <HexField label="Preimage hash" value={result.hash} />
        <HexField label="Call data" value={result.callData} maxHeight />
        <a
          href={result.decodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="glimmer-text underline text-sm inline-flex items-center gap-1"
        >
          Open decoded extrinsic in Polkadot.js Apps ↗
        </a>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem
          value="verify"
          className="border-none glass-sub rounded-2xl overflow-hidden"
        >
          <AccordionTrigger className="text-sm text-primary px-4 py-3 hover:no-underline hover:bg-white/30 transition-colors">
            <span className="flex items-center gap-2 flex-1">
              <LucideShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Verify</span>
              <span className="text-xs text-muted-foreground font-normal ml-auto mr-2">
                storage writes
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {result.storageWrites.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Each key is{" "}
                  <code className="px-1 rounded bg-white/40">
                    twox_128(&quot;:NAME:&quot;)
                  </code>
                  . Use the hasher below to confirm.
                </div>
                <div className="space-y-2">
                  {result.storageWrites.map((w) => (
                    <div
                      key={w.key}
                      className="rounded-xl bg-white/40 p-3 text-sm text-primary space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-medium">{w.name}</span>
                        {w.sourceUrl && (
                          <a
                            href={w.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="glimmer-text underline text-xs"
                          >
                            runtime source ↗
                          </a>
                        )}
                      </div>
                      <div className="font-mono text-xs break-all">
                        <span className="text-muted-foreground">key </span>
                        {w.key}
                      </div>
                      <div className="font-mono text-xs break-all">
                        <span className="text-muted-foreground">value </span>
                        {w.value}
                      </div>
                    </div>
                  ))}
                </div>
                <KeyHasher writes={result.storageWrites} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function HexField({
  label,
  value,
  maxHeight,
}: {
  label: string;
  value: string;
  maxHeight?: boolean;
}) {
  return (
    <div className="glass-sub rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-primary">{label}</span>
        <CopyButton value={value} />
      </div>
      <code
        className={`block font-mono text-xs break-all text-primary/90 ${
          maxHeight ? "max-h-32 overflow-y-auto" : ""
        }`}
      >
        {value}
      </code>
    </div>
  );
}

function CopyButton({
  value,
  variant = "ghost",
}: {
  value: string;
  variant?: "ghost" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
  };
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Button size="sm" variant={variant} onClick={onClick}>
      {copied ? (
        <span className="inline-flex items-center gap-1">
          <LucideCheck className="h-3.5 w-3.5" />
          Copied
        </span>
      ) : (
        "Copy"
      )}
    </Button>
  );
}

function SubmissionLinks({ urls }: { urls: governance.SubmissionUrls }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-primary">Submit</div>

      <div className="glass-sub rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-primary">
            Asset Hub batch
          </div>
          <div className="text-xs text-muted-foreground">
            Anyone on the team
          </div>
        </div>
        <Button asChild size="sm">
          <a
            href={urls.assetHubBatchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open ↗
          </a>
        </Button>
        <CopyButton value={urls.assetHubBatchUrl} />
      </div>

      <div className="glass-sub rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-primary">
            Fellowship whitelist
          </div>
          <div className="text-xs text-muted-foreground">
            Rank-3+ Fellow only, share via Element
          </div>
        </div>
        <CopyButton value={urls.fellowshipWhitelistUrl} variant="secondary" />
        <Button asChild size="sm" variant="ghost">
          <a
            href={urls.fellowshipWhitelistUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open ↗
          </a>
        </Button>
      </div>
    </div>
  );
}

function KeyHasher({ writes }: { writes: governance.StorageWrite[] }) {
  const [input, setInput] = useState(writes[0]?.name ?? "");
  const [computed, setComputed] = useState<string | null>(null);

  const compute = () => {
    const trimmed = input.trim().replace(/^:|:$/g, "");
    if (!trimmed) {
      setComputed(null);
      return;
    }
    setComputed(xxhashAsHex(`:${trimmed}:`, 128, true));
  };

  const match = computed && writes.find((w) => w.key === computed);

  return (
    <div className="glass-sub rounded-xl p-3 space-y-2">
      <div className="text-xs font-medium text-primary">
        Verify a storage key
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a parameter name (with or without surrounding <code>:</code>{" "}
        colons) and click <em>Hash</em>. Compare the result to the keys above.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="BridgeHubEthereumBaseFeeV2"
          className="flex-1 text-sm font-mono rounded-xl px-3 py-2 bg-white/30 text-primary placeholder:text-muted-foreground border-0 outline-none"
          onKeyDown={(e) => e.key === "Enter" && compute()}
        />
        <Button size="sm" onClick={compute} disabled={!input.trim()}>
          Hash
        </Button>
      </div>
      {computed && (
        <div className="space-y-1">
          <div className="font-mono text-xs break-all text-primary">
            <span className="text-muted-foreground">twox_128 </span>
            {computed}
          </div>
          {match ? (
            <div className="text-xs text-green-700">
              ✓ Matches{" "}
              <span className="font-mono font-medium">{match.name}</span> above.
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              No match among the storage writes above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
