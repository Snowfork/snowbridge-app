"use client";

import { useContext, useState } from "react";
import { useAtomValue } from "jotai";
import { governance } from "@snowbridge/api";
import { Button } from "@/components/ui/button";
import { xxhashAsHex } from "@polkadot/util-crypto";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { BridgeInfoContext } from "@/app/providers";

type HaltOption = keyof governance.haltBridge.HaltBridgeOptions;

interface Preset {
  id: string;
  label: string;
  whenToUse: string;
  options: HaltOption[];
}

interface PresetGroup {
  title: string;
  presets: Preset[];
}

const PRESET_GROUPS: PresetGroup[] = [
  {
    title: "Catch-all",
    presets: [
      {
        id: "halt-all",
        label: "Halt everything",
        whenToUse:
          "Most defensive. Use when the cause is uncertain or any component is suspect.",
        options: ["all"],
      },
    ],
  },
  {
    title: "V1 only",
    presets: [
      {
        id: "full-v1",
        label: "Full V1 pause (both directions)",
        whenToUse:
          "Stops all V1 traffic at every layer (Gateway, inbound, outbound). V2 keeps flowing.",
        options: [
          "gatewayV1",
          "inboundQueueV1",
          "outboundQueueV1",
          "assethubMaxFeeV1",
        ],
      },
      {
        id: "v1-p2e",
        label: "V1 Polkadot → Ethereum only",
        whenToUse:
          "Blocks V1 outbound at the BH queue and caps the V1 fee. V1 E→P and all V2 traffic keep flowing.",
        options: ["outboundQueueV1", "assethubMaxFeeV1"],
      },
      {
        id: "v1-e2p",
        label: "V1 Ethereum → Polkadot only",
        whenToUse: "Blocks V1 inbound on BridgeHub. Other paths keep flowing.",
        options: ["inboundQueueV1"],
      },
    ],
  },
  {
    title: "V2 only",
    presets: [
      {
        id: "full-v2",
        label: "Full V2 pause (both directions)",
        whenToUse:
          "Stops all V2 traffic at every layer (Gateway, inbound, outbound). V1 keeps flowing.",
        options: [
          "gatewayV2",
          "inboundQueueV2",
          "systemFrontend",
          "assethubMaxFeeV2",
        ],
      },
      {
        id: "v2-p2e",
        label: "V2 Polkadot → Ethereum only",
        whenToUse:
          "Blocks new V2 sends from AssetHub. V2 E→P and all V1 traffic keep flowing.",
        options: ["systemFrontend", "assethubMaxFeeV2"],
      },
      {
        id: "v2-e2p",
        label: "V2 Ethereum → Polkadot only",
        whenToUse: "Blocks V2 inbound on BridgeHub. Other paths keep flowing.",
        options: ["inboundQueueV2"],
      },
    ],
  },
  {
    title: "By incident type",
    presets: [
      {
        id: "beacon-compromise",
        label: "Beacon light client compromise",
        whenToUse:
          "Halts new beacon-header ingestion. Halt inbound queues separately to block proof-consuming flows.",
        options: ["ethereumClient"],
      },
    ],
  },
];

interface OptionDescriptor {
  key: HaltOption;
  label: string;
  description: string;
}

const ADVANCED_GROUPS: { title: string; options: OptionDescriptor[] }[] = [
  {
    title: "Catch-all",
    options: [
      {
        key: "all",
        label: "Halt everything",
        description:
          "Equivalent to ticking every other box. Stops both V1 and V2, both directions.",
      },
    ],
  },
  {
    title: "Gateway (Ethereum side)",
    options: [
      {
        key: "gateway",
        label: "Gateway (V1 + V2)",
        description:
          "SetOperatingMode on the Ethereum Gateway via both V1 and V2 system pallets.",
      },
      {
        key: "gatewayV1",
        label: "Gateway V1 only",
        description:
          "Blocks V1 sendToken / sendMessage on the Gateway. V2 continues.",
      },
      {
        key: "gatewayV2",
        label: "Gateway V2 only",
        description:
          "Blocks v2_sendMessage / v2_registerToken on the Gateway. V1 continues.",
      },
    ],
  },
  {
    title: "Inbound (Ethereum → Polkadot)",
    options: [
      {
        key: "inboundQueue",
        label: "Inbound queue (V1 + V2)",
        description: "Blocks Ethereum → Polkadot for both V1 and V2.",
      },
      {
        key: "inboundQueueV1",
        label: "Inbound queue V1 only",
        description: "Blocks V1 Ethereum → Polkadot. V2 inbound continues.",
      },
      {
        key: "inboundQueueV2",
        label: "Inbound queue V2 only",
        description: "Blocks V2 Ethereum → Polkadot. V1 inbound continues.",
      },
    ],
  },
  {
    title: "Outbound (Polkadot → Ethereum)",
    options: [
      {
        key: "outboundQueue",
        label: "Outbound queue + AH frontend",
        description:
          "Halts V1 outbound-queue on BridgeHub AND AssetHub system-frontend (router-layer block for V1 and V2).",
      },
      {
        key: "outboundQueueV1",
        label: "BH outbound-queue V1 only",
        description:
          "Halts V1 outbound-queue on BridgeHub only. V2 P→E continues; AH frontend untouched.",
      },
      {
        key: "systemFrontend",
        label: "AH system-frontend only",
        description:
          "V2 router-layer P→E block. V1 BridgeHub outbound-queue continues.",
      },
      {
        key: "assethubMaxFee",
        label: "AH fee = MAX (V1 + V2)",
        description:
          "Fee deterrent: sets both BridgeHubEthereumBaseFee and BridgeHubEthereumBaseFeeV2 to u128::MAX.",
      },
      {
        key: "assethubMaxFeeV1",
        label: "AH fee = MAX (V1 only)",
        description:
          "Sets only BridgeHubEthereumBaseFee to u128::MAX. V2 fee untouched.",
      },
      {
        key: "assethubMaxFeeV2",
        label: "AH fee = MAX (V2 only)",
        description:
          "Sets only BridgeHubEthereumBaseFeeV2 to u128::MAX. V1 fee untouched.",
      },
    ],
  },
  {
    title: "Beacon light client",
    options: [
      {
        key: "ethereumClient",
        label: "Ethereum beacon light client",
        description:
          "Blocks new beacon-header ingestion. Does NOT propagate into downstream proof-consuming flows; halt inbound queues separately for that.",
      },
    ],
  },
];

export function HaltBridgeForm() {
  const context = useAtomValue(snowbridgeContextAtom);
  const { registry } = useContext(BridgeInfoContext)!;

  const [selected, setSelected] = useState<
    Partial<Record<HaltOption, boolean>>
  >({});
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    governance.haltBridge.HaltBridgePreimage | null
  >(null);

  const applyPreset = (preset: Preset) => {
    const next: Partial<Record<HaltOption, boolean>> = {};
    for (const o of preset.options) next[o] = true;
    setSelected(next);
    setActivePresetId(preset.id);
    setResult(null);
    setError(null);
  };

  const toggle = (key: HaltOption) => {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
    setActivePresetId(null);
    setResult(null);
  };

  const clearAll = () => {
    setSelected({});
    setActivePresetId(null);
    setResult(null);
    setError(null);
  };

  const generate = async () => {
    setError(null);
    setResult(null);
    if (!context) {
      setError("Snowbridge context not ready. Try again in a moment.");
      return;
    }
    if (Object.values(selected).every((v) => !v)) {
      setError("Pick a preset or one or more advanced options first.");
      return;
    }
    setLoading(true);
    try {
      const assetHub = await context.parachain(registry.assetHubParaId);
      const bridgeHub = await context.parachain(registry.bridgeHubParaId);
      const preimage = await governance.haltBridge.buildHaltBridgePreimage(
        assetHub,
        bridgeHub,
        selected as governance.haltBridge.HaltBridgeOptions,
      );
      setResult(preimage);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const selectionCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="w-full max-w-[min(48rem,calc(100vw-2rem))] mx-auto space-y-6">
      <div className="glass rounded-3xl border border-white/60 py-8 px-6 md:py-10 md:px-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-primary">
            Governance: halt bridge
          </h1>
          <p className="text-sm text-muted-foreground">
            Build a preimage to halt parts of the Snowbridge V1/V2 stack on
            Polkadot. The result is a SCALE-encoded call you submit to the
            Whitelisted Caller Track in Polkadot.js Apps. Nothing here signs or
            submits anything, it just produces the hash and call data. Pick a
            preset that matches the failure mode, or expand{" "}
            <span className="italic">Advanced options</span> below for finer
            control.
          </p>
        </div>

        <div className="space-y-5">
          {PRESET_GROUPS.map((group) => (
            <fieldset key={group.title} className="space-y-1">
              <legend className="text-xs font-medium text-muted-foreground mb-2">
                {group.title}
              </legend>
              {group.presets.map((p) => (
                <label
                  key={p.id}
                  className="text-muted-foreground flex items-start gap-3 cursor-pointer rounded-xl p-2 hover:bg-white/30 transition-colors"
                >
                  <input
                    type="radio"
                    name="halt-preset"
                    className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                    checked={activePresetId === p.id}
                    onChange={() => applyPreset(p)}
                  />
                  <span className="flex-1">
                    <span className="font-medium text-sm text-primary block">
                      {p.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.whenToUse}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="advanced" className="border-none">
            <AccordionTrigger className="text-sm text-primary py-2 hover:no-underline">
              Advanced options
              {selectionCount > 0 && !activePresetId && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({selectionCount} selected)
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid md:grid-cols-2 gap-6 pt-2">
                {ADVANCED_GROUPS.map((g) => (
                  <fieldset key={g.title} className="space-y-1">
                    <legend className="text-xs font-medium text-muted-foreground mb-2">
                      {g.title}
                    </legend>
                    {g.options.map((o) => (
                      <label
                        key={o.key}
                        className="text-muted-foreground flex items-start gap-3 cursor-pointer rounded-xl p-2 hover:bg-white/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                          checked={!!selected[o.key]}
                          onChange={() => toggle(o.key)}
                        />
                        <span className="flex-1">
                          <span className="font-medium text-sm text-primary block">
                            {o.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {o.description}
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
            {loading ? "Generating…" : "Generate preimage"}
          </Button>
          {selectionCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear selection
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

      {result && <PreimageResult result={result} />}
    </div>
  );
}

function PreimageResult({
  result,
}: {
  result: governance.haltBridge.HaltBridgePreimage;
}) {
  const copy = (text: string) => navigator.clipboard.writeText(text);
  return (
    <div className="glass rounded-3xl border border-white/60 py-8 px-6 md:py-10 md:px-10 space-y-5">
      <h2 className="text-xl font-semibold text-primary">Preimage</h2>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Hash (submit this to the Whitelisted Caller Track)
        </div>
        <div className="flex items-center gap-2">
          <code className="glass-sub break-all text-sm rounded-xl p-3 flex-1 text-primary">
            {result.hash}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => copy(result.hash)}
          >
            Copy
          </Button>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Call data ({result.encodedSize} bytes)
        </div>
        <div className="flex items-start gap-2">
          <code className="glass-sub break-all text-sm rounded-xl p-3 flex-1 max-h-32 overflow-y-auto text-primary">
            {result.callData}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => copy(result.callData)}
          >
            Copy
          </Button>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">
          What this halts
        </div>
        <ul className="list-disc pl-5 space-y-1 text-sm text-primary">
          {result.summary.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      {result.storageWrites.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Storage writes (verify the keys)
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Each storage key is{" "}
            <code className="px-1 rounded bg-white/30">
              twox_128(&quot;:NAME:&quot;)
            </code>
            . Re-derive it below to confirm the call data targets the named
            parameter and nothing else.
          </p>
          <div className="space-y-2 mb-3">
            {result.storageWrites.map((w) => (
              <div
                key={w.key}
                className="glass-sub rounded-xl p-3 text-sm text-primary space-y-1"
              >
                <div className="font-medium">{w.name}</div>
                <div className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">key </span>
                  {w.key}
                </div>
                <div className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">value </span>
                  {w.value}
                </div>
                {w.sourceUrl && (
                  <div className="text-xs">
                    <a
                      href={w.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glimmer-text underline"
                    >
                      runtime source ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
          <KeyHasher writes={result.storageWrites} />
        </div>
      )}

      <div>
        <a
          href={result.decodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="glimmer-text underline text-sm"
        >
          Open decoded extrinsic in Polkadot.js Apps ↗
        </a>
      </div>
    </div>
  );
}

function KeyHasher({
  writes,
}: {
  writes: governance.haltBridge.StorageWrite[];
}) {
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
        Paste a parameter name (with or without surrounding{" "}
        <code>:</code> colons) and click <em>Hash</em>. Compare the result to
        the keys above.
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
