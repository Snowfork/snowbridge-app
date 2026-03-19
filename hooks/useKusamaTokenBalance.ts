import { BridgeInfoContext } from "@/app/providers";
import { type SnowbridgeContext } from "@/lib/snowbridge";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { getKusamaTokenBalance } from "@/utils/balances";
import { AssetRegistry } from "@snowbridge/base-types";
import { useAtomValue } from "jotai";
import { useContext } from "react";
import useSWR from "swr";

async function fetchKusamaTokenBalance([
  context,
  token,
  source,
  registry,
  sourceAccount,
]: [
  SnowbridgeContext | null,
  string,
  string,
  AssetRegistry,
  string | undefined,
  string,
]) {
  if (!sourceAccount || !context) return;

  const balance = await getKusamaTokenBalance({
    context,
    token,
    source,
    registry,
    sourceAccount,
  });

  return balance;
}

export function useKusamaTokenBalance(
  sourceAccount: string | undefined,
  source: string,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const { registry } = useContext(BridgeInfoContext)!;
  return useSWR(
    [context, token, source, registry, sourceAccount, "nativeKusamaBalances"],
    fetchKusamaTokenBalance,
  );
}
