import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { getTokenBalance } from "@/utils/balances";
import { assetsV2, Context } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useAssetRegistry } from "./useAssetRegistry";

async function fetchTokenBalance([
  context,
  token,
  ethChainId,
  source,
  registry,
  sourceAccount,
]: [
  Context | null,
  string,
  number,
  assetsV2.Source,
  assetsV2.AssetRegistry,
  string | undefined,
  string,
]) {
  if (!sourceAccount || !context) return;

  const balance = await getTokenBalance({
    context,
    token,
    ethereumChainId: BigInt(ethChainId),
    source,
    registry,
    sourceAccount,
  });

  return balance;
}

export function useTokenBalance(
  sourceAccount: string | undefined,
  source: assetsV2.Source,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const environment = useAtomValue(snowbridgeEnvironmentAtom);
  const { data: registry } = useAssetRegistry();
  return useSWR(
    [
      context,
      token,
      environment.ethChainId,
      source,
      registry,
      sourceAccount,
      "nativeBalance",
    ],
    fetchTokenBalance,
  );
}
