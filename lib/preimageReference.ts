/*
  Verify a generated halt / resume preimage against the canonical, version-
  controlled reference.

  The reference lives in polkadot-ecosystem-tests (PET), where a Chopsticks test
  executes the exact committed bytes against forked live chains every ~6 hours.
  Comparing the hash an operator generates here against that reference reduces
  incident-time verification to a single string match instead of decoding SCALE
  under pressure.

  IMPORTANT: this in-app check is a CONVENIENCE, not the trust anchor. A
  compromised frontend could fake a green result. The authoritative check is a
  human comparing the displayed preimage hash against PET on GitHub (link below)
  before whitelisting it. The UI states this explicitly.
*/

// Raw URL the app fetches. Overridable for testing against a branch/fork.
export const PET_REFERENCE_URL =
  process.env.NEXT_PUBLIC_PET_REFERENCE_URL ??
  "https://raw.githubusercontent.com/open-web3-stack/polkadot-ecosystem-tests/master/packages/shared/src/snowbridge/referencePreimages.json";

// Human-readable GitHub view, shown as the "verify on GitHub" link. Derived from
// the raw URL so an override points both at the same place.
export const PET_REFERENCE_BLOB_URL =
  process.env.NEXT_PUBLIC_PET_REFERENCE_BLOB_URL ??
  "https://github.com/open-web3-stack/polkadot-ecosystem-tests/blob/master/packages/shared/src/snowbridge/referencePreimages.json";

export type Operation = "halt" | "resume";

export interface ReferencePreimageEntry {
  hash: string;
  callData: string;
  encodedSize: number;
}

export interface ReferenceFile {
  description?: string;
  halt: ReferencePreimageEntry;
  resume: ReferencePreimageEntry;
}

/**
 * Feature-detect the deterministic SDK. The reference is pinned against the
 * constant-fallback-weight preimage that ships in @snowbridge/api alongside
 * FULL_HALT_OPTIONS. Older SDKs embed a live-queried weight, so their bytes
 * won't match the reference even for an identical selection, and comparing
 * would produce a false mismatch. Gate the whole check on this so the badge
 * stays silent (rather than scary-red) until the app upgrades the SDK.
 */
export async function sdkProducesDeterministicPreimage(): Promise<boolean> {
  // Dynamic import so merely importing this module (e.g. for the pure
  // compareToReference in a unit test) does not pull in the heavy SDK. The form
  // already loads @snowbridge/api statically, so at runtime this resolves to the
  // same module instance.
  const { governance } = await import("@snowbridge/api");
  return "FULL_HALT_OPTIONS" in (governance as Record<string, unknown>);
}

export type ReferenceVerdict =
  | { kind: "match"; reference: ReferenceFile }
  | {
      kind: "mismatch";
      reference: ReferenceFile;
      expected: ReferencePreimageEntry;
    }
  // Installed SDK predates the deterministic preimage build; can't compare.
  | { kind: "unsupported" }
  // Network error, 404 (reference not published yet), or parse failure.
  | { kind: "unavailable"; reason: string };

/**
 * Pure comparison, no I/O. Exposed for unit testing. A preimage matches the
 * reference when BOTH the call data and the hash are byte-identical (the hash
 * alone would suffice, but comparing the bytes too makes a mismatch easy to
 * eyeball in the diff).
 */
export function compareToReference(
  operation: Operation,
  result: { hash: string; callData: string },
  reference: ReferenceFile,
): "match" | "mismatch" {
  const expected = operation === "halt" ? reference.halt : reference.resume;
  const match =
    result.callData === expected.callData && result.hash === expected.hash;
  return match ? "match" : "mismatch";
}

export async function fetchReference(
  signal?: AbortSignal,
): Promise<ReferenceFile> {
  const res = await fetch(PET_REFERENCE_URL, { signal, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`reference fetch failed (HTTP ${res.status})`);
  }
  return (await res.json()) as ReferenceFile;
}

export async function verifyAgainstReference(
  operation: Operation,
  result: { hash: string; callData: string },
  signal?: AbortSignal,
): Promise<ReferenceVerdict> {
  if (!(await sdkProducesDeterministicPreimage())) {
    return { kind: "unsupported" };
  }
  let reference: ReferenceFile;
  try {
    reference = await fetchReference(signal);
  } catch (e) {
    return {
      kind: "unavailable",
      reason: e instanceof Error ? e.message : String(e),
    };
  }
  const verdict = compareToReference(operation, result, reference);
  if (verdict === "match") {
    return { kind: "match", reference };
  }
  const expected = operation === "halt" ? reference.halt : reference.resume;
  return { kind: "mismatch", reference, expected };
}
