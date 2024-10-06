"use client";
import { Context, assets, environment } from "@snowbridge/api";
import SnowbridgeEnvironment = environment.SnowbridgeEnvironment;
import { formatBalance } from "@/utils/formatting";
import { ErrorInfo } from "./types";
import { parseUnits } from "ethers";

export function parseAmount(
  decimals: string,
  metadata: assets.ERC20Metadata,
): bigint {
  return parseUnits(decimals, metadata.decimals);
}

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
  env: SnowbridgeEnvironment,
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
    ethereumChainId: BigInt(env.ethChainId),
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
