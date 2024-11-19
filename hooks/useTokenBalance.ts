import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { getTokenBalance } from "@/utils/balances";
import { Context, environment } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";

async function fetchTokenBalance([
  context,
  token,
  ethChainId,
  source,
  sourceAccount,
]: [
  Context | null,
  string,
  number,
  environment.TransferLocation,
  string | undefined,
  string,
]) {
  if (!sourceAccount || !context) return;

  const balance = await getTokenBalance({
    context,
    token,
    ethereumChainId: BigInt(ethChainId),
    source,
    sourceAccount,
  });

  return balance;
}

export function useTokenBalance(
  sourceAccount: string | undefined,
  source: environment.TransferLocation,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const environment = useAtomValue(snowbridgeEnvironmentAtom);
  return useSWR(
    [
      context,
      token,
      environment.ethChainId,
      source,
      sourceAccount,
      "nativeBalance",
    ],
    fetchTokenBalance,
  );
}
