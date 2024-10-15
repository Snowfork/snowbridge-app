"use client";
import { Context, assets, environment } from "@snowbridge/api";
import SnowbridgeEnvironment = environment.SnowbridgeEnvironment;
import { formatBalance } from "@/utils/formatting";
import { ErrorInfo } from "./types";
import { ApiPromise } from "@polkadot/api";
import { RemoteAssetId } from "./types";
import { Option } from "@polkadot/types";
import { AssetBalance } from "@polkadot/types/interfaces";

export async function getTokenBalance({
  context,
  token,
  ethereumChainId,
  source,
  sourceAccount,
}: {
  context: Context;
  token: string;
  ethereumChainId: bigint;
  source: environment.TransferLocation;
  sourceAccount: string;
}): Promise<{
  balance: bigint;
  gatewayAllowance?: bigint;
}> {
  switch (source.type) {
    case "substrate": {
      if (source.paraInfo?.paraId === undefined) {
        throw Error(`ParaId not configured for source ${source.name}.`);
      }
      const parachain =
        context.polkadot.api.parachains[source.paraInfo?.paraId] ??
        context.polkadot.api.assetHub;
      const location = assets.erc20TokenToAssetLocation(
        parachain.registry,
        ethereumChainId,
        token,
      );
      const balance = await assets.palletAssetsBalance(
        parachain,
        location,
        sourceAccount,
        "foreignAssets",
      );
      return { balance: balance ?? 0n, gatewayAllowance: undefined };
    }
    case "ethereum": {
      return await assets.assetErc20Balance(context, token, sourceAccount);
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
