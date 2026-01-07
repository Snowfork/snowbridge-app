import { RegistryContext } from "@/app/providers";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { getTokenBalance } from "@/utils/balances";
import { assetsV2, Context } from "@snowbridge/api";
import { AssetRegistry, TransferLocation } from "@snowbridge/base-types";
import { useAtomValue } from "jotai";
import { useContext } from "react";
import useSWR from "swr";

async function fetchTokenBalance([
  context,
  token,
  source,
  destination,
  registry,
  sourceAccount,
]: [
  Context | null,
  string,
  TransferLocation,
  TransferLocation,
  AssetRegistry,
  string | undefined,
  string,
]) {
  if (!sourceAccount || !context) return;

  const balance = await getTokenBalance({
    context,
    token,
    source,
    destination,
    registry,
    sourceAccount,
  });

  return balance;
}

export function useTokenBalance(
  sourceAccount: string | undefined,
  source: TransferLocation,
  destination: TransferLocation,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const registry = useContext(RegistryContext)!;
  return useSWR(
    [
      context,
      token,
      source,
      destination,
      registry,
      sourceAccount,
      "nativeBalance",
    ],
    fetchTokenBalance,
  );
}
