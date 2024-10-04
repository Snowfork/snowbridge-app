"use client";
import { Context, assets, environment } from "@snowbridge/api";
import { formatBalance } from "@/utils/formatting";
import { ErrorInfo } from "./types";
import { ApiPromise } from "@polkadot/api";

async function getTokenBalance({
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

export function updateBalance(
  context: Context,
  ethereumChainId: number,
  source: environment.TransferLocation,
  sourceAccount: string,
  token: string,
  tokenMetadata: assets.ERC20Metadata,
  setBalanceDisplay: (_: string) => void,
  setError: (_: ErrorInfo | null) => void,
) {
  getTokenBalance({
    context,
    token,
    ethereumChainId: BigInt(ethereumChainId),
    source,
    sourceAccount,
  })
    .then((result) => {
      let allowance = "";
      if (result.gatewayAllowance !== undefined) {
        allowance = ` (Allowance: ${formatBalance({
          number: result.gatewayAllowance ?? 0n,
          decimals: Number(tokenMetadata.decimals),
        })} ${tokenMetadata.symbol})`;
      }
      setBalanceDisplay(
        `${formatBalance({
          number: result.balance,
          decimals: Number(tokenMetadata.decimals),
        })} ${tokenMetadata.symbol} ${allowance}`,
      );
    })
    .catch((err) => {
      console.error(err);
      setBalanceDisplay("unknown");
      setError({
        title: "Error",
        description: `Could not fetch asset balance.`,
        errors: [],
      });
    });
}

export async function fetchForeignAssetsBalances(
  api: ApiPromise,
  remoteAssetId: any,
  sourceAccount: string,
  decimals: number,
) {
  const foreignAssets = await api.query.foreignAssets.account(
    remoteAssetId,
    sourceAccount,
  );

  return formatBalance({
    number: foreignAssets.unwrapOrDefault().balance.toBigInt(),
    decimals,
  });
}
