import { snowbridgeContextAtom } from "@/store/snowbridge";
import { getTokenBalance } from "@/utils/balances";
import { assetsV2, Context } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useAssetRegistry } from "./useAssetRegistry";

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
  assetsV2.TransferLocation,
  assetsV2.TransferLocation,
  assetsV2.AssetRegistry,
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
  source: assetsV2.TransferLocation,
  destination: assetsV2.TransferLocation,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const { data: registry } = useAssetRegistry();
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
