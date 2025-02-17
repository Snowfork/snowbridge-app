"use client";
import { Context, assets, assetsV2 } from "@snowbridge/api";
import { formatBalance } from "@/utils/formatting";
import { ApiPromise } from "@polkadot/api";
import { RemoteAssetId } from "./types";
import { Option } from "@polkadot/types";
import { AssetBalance } from "@polkadot/types/interfaces";

interface TokenBalanceProps {
  context: Context;
  token: string;
  source: assetsV2.Source;
  registry: assetsV2.AssetRegistry;
  sourceAccount: string;
}
export async function getTokenBalance({
  context,
  token,
  source,
  registry,
  sourceAccount,
}: TokenBalanceProps): Promise<{
  balance: bigint;
  gatewayAllowance?: bigint;
  nativeBalance: bigint;
  nativeSymbol: string;
  nativeTokenDecimals: number;
}> {
  switch (source.type) {
    case "substrate": {
      const para = registry.parachains[source.source];
      const parachain =
        para && context.hasParachain(para.parachainId)
          ? await context.parachain(para.parachainId)
          : await context.assetHub();
      const [balance, nativeBalance] = await Promise.all([
        assetsV2.getTokenBalance(
          parachain,
          para.info.specName,
          sourceAccount,
          registry.ethChainId,
          token,
        ),
        assetsV2.getNativeBalance(parachain, sourceAccount),
      ]);
      return {
        balance: balance ?? 0n,
        gatewayAllowance: undefined,
        nativeBalance,
        nativeTokenDecimals: para.info.tokenDecimals,
        nativeSymbol: para.info.tokenSymbols,
      };
    }
    case "ethereum": {
      const [erc20Asset, nativeBalance] = await Promise.all([
        assets.assetErc20Balance(context, token, sourceAccount),
        context.ethereum().getBalance(sourceAccount),
      ]);
      return {
        ...erc20Asset,
        nativeBalance,
        nativeSymbol: "ETH",
        nativeTokenDecimals: 18,
      };
    }
    default:
      throw Error(`Unknown source type ${source.type}.`);
  }
}

export async function fetchForeignAssetsBalances(
  api: ApiPromise,
  remoteAssetId: RemoteAssetId,
  sourceAccount: string,
  decimals: number,
) {
  const foreignAssets = await api.query.foreignAssets.account<
    Option<AssetBalance>
  >(remoteAssetId, sourceAccount);

  return formatBalance({
    number: foreignAssets.unwrapOrDefault().balance.toBigInt(),
    decimals,
    displayDecimals: 3,
  });
}
