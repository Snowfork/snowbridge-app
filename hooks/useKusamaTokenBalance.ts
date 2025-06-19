import { RegistryContext } from "@/app/providers";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { getKusamaTokenBalance, getTokenBalance } from "@/utils/balances";
import { assetsV2, Context } from "@snowbridge/api";
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
  Context | null,
  string,
  string,
  assetsV2.AssetRegistry,
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
  const registry = useContext(RegistryContext)!;
  return useSWR(
    [context, token, source, registry, sourceAccount, "nativeKusamaBalances"],
    fetchKusamaTokenBalance,
  );
}
