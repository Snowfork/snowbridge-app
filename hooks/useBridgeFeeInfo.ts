import { snowbridgeApiAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useContext } from "react";
import { BridgeInfoContext } from "@/app/providers";
import { AssetRegistry, TransferLocation } from "@snowbridge/base-types";
import { assetsV2, type VolumeFeeParams } from "@snowbridge/api";
import { type SnowbridgeClient } from "@/lib/snowbridge";
import { parseUnits } from "ethers";
import { fetchTokenPrices } from "@/utils/coindesk";
import { BridgeDeliveryFee } from "@/utils/deliveryFee";

async function fetchBridgeFeeInfo([
  api,
  source,
  destination,
  registry,
  token,
  amount,
]: [
  SnowbridgeClient | null,
  TransferLocation,
  TransferLocation,
  AssetRegistry,
  string,
  string,
]): Promise<BridgeDeliveryFee | undefined> {
  if (api === null) {
    return;
  }
  const asset =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[token];

  const amountInSmallestUnit = parseUnits(
    amount && amount.trim() !== "" ? amount.trim() : "0",
    asset.decimals,
  );

  const sender = api.sender(source, destination);

  const prices = await fetchTokenPrices([asset.symbol, "ETH"]);
  const tokenPriceUsd = prices[asset.symbol.toUpperCase()] ?? 0;
  const ethPriceUsd = prices["ETH"] ?? 0;
  const tokenAmountFloat = Number(amount?.trim() || "0");
  const txValueUsdNumber = Math.floor(tokenAmountFloat * tokenPriceUsd);
  const txValueUsd = BigInt(Math.max(0, txValueUsdNumber));

  let volumeFee: VolumeFeeParams | undefined;
  if (tokenPriceUsd > 0 && ethPriceUsd > 0 && txValueUsd > 0n) {
    const ethPriceCents = Math.round(ethPriceUsd * 100);
    volumeFee = {
      txValueUsd,
      ethToUsdNumerator: BigInt(ethPriceCents),
      ethToUsdDenominator: 100n,
    };
  }

  switch (sender.kind) {
    case "ethereum->polkadot":
      return await sender.fee(token, { volumeFee });
    case "polkadot->ethereum":
      return source.parachain?.features.supportsV2
        ? await sender.fee(token, {
            feeTokenLocation: assetsV2.DOT_LOCATION,
            volumeFee,
          })
        : await sender.fee(token);
    case "ethereum->ethereum":
      return await sender.fee(token);
    case "polkadot->polkadot":
      return await sender.fee(token);
    case "ethereum_l2->polkadot": {
      if (source.kind !== "ethereum_l2") {
        throw `Invalid source ${source.key}, expected ethereum_l2 source.`;
      }
      const l2asset = Object.values(source.ethChain.assets).find(
        (x) => x.swapTokenAddress?.toLowerCase() === token.toLowerCase(),
      );
      if (!l2asset) {
        throw Error(`Could not find l2 token for l1 token ${token}`);
      }
      return await sender.fee(l2asset.token, amountInSmallestUnit, {
        volumeFee,
      });
    }
    case "polkadot->ethereum_l2":
      return source.parachain?.features.supportsV2
        ? await sender.fee(token, amountInSmallestUnit, {
            feeTokenLocation: assetsV2.DOT_LOCATION,
            volumeFee,
          })
        : await sender.fee(token, amountInSmallestUnit);
    default:
      throw Error(`Unknown transfer type ${sender.kind}`);
  }
}

export function useBridgeFeeInfo(
  source: TransferLocation,
  destination: TransferLocation,
  token: string,
  amount: string,
) {
  if (amount === undefined) throw Error(`abc`);
  const api = useAtomValue(snowbridgeApiAtom);
  const { registry } = useContext(BridgeInfoContext)!;
  return useSWR(
    [api, source, destination, registry, token, amount, "feeInfo"],
    fetchBridgeFeeInfo,
    {
      errorRetryCount: 30,
    },
  );
}
