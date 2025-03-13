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
  source: assetsV2.TransferLocation;
  destination: assetsV2.TransferLocation;
  registry: assetsV2.AssetRegistry;
  sourceAccount: string;
}
export async function getTokenBalance({
  context,
  token,
  source,
  destination,
  registry,
  sourceAccount,
}: TokenBalanceProps): Promise<{
  balance: bigint;
  isNativeTransfer: boolean;
  gatewayAllowance?: bigint;
  nativeBalance: bigint;
  nativeSymbol: string;
  nativeTokenDecimals: number;
  dotBalance: bigint;
  dotTokenSymbol: string;
  dotTokenDecimals: number;
}> {
  if (destination.type === "ethereum") {
    const para = source.parachain!;
    const parachain =
      para && context.hasParachain(para.parachainId)
        ? await context.parachain(para.parachainId)
        : await context.assetHub();
    const [balance, dotBalance, nativeBalance] = await Promise.all([
      assetsV2.getTokenBalance(
        parachain,
        para.info.specName,
        sourceAccount,
        registry.ethChainId,
        token,
      ),
      assetsV2.getDotBalance(parachain, para.info.specName, sourceAccount),
      assetsV2.getNativeBalance(parachain, sourceAccount),
    ]);
    return {
      balance: balance ?? 0n,
      gatewayAllowance: undefined,
      isNativeTransfer: false,
      nativeBalance,
      nativeTokenDecimals: para.info.tokenDecimals,
      nativeSymbol: para.info.tokenSymbols,
      dotBalance: dotBalance,
      dotTokenDecimals: registry.relaychain.tokenDecimals,
      dotTokenSymbol: registry.relaychain.tokenSymbols,
    };
  } else if (destination.type === "substrate") {
    const nativeBalance = await context.ethereum().getBalance(sourceAccount);
    let erc20Asset: { balance: bigint; gatewayAllowance?: bigint } = {
      balance: nativeBalance,
    };
    let isNativeTransfer = true;
    if (token !== assetsV2.ETHER_TOKEN_ADDRESS) {
      erc20Asset = await assets.assetErc20Balance(
        context,
        token,
        sourceAccount,
      );
      isNativeTransfer = false;
    }
    return {
      ...erc20Asset,
      nativeBalance,
      isNativeTransfer,
      nativeSymbol: "ETH",
      nativeTokenDecimals: 18,
      dotBalance: 0n,
      dotTokenDecimals: registry.relaychain.tokenDecimals,
      dotTokenSymbol: registry.relaychain.tokenSymbols,
    };
  } else {
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
