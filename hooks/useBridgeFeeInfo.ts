import { snowbridgeApiAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { FeeInfo } from "@/utils/types";
import { useContext } from "react";
import { BridgeInfoContext } from "@/app/providers";
import { AssetRegistry, TransferLocation } from "@snowbridge/base-types";
import { assetsV2, type VolumeFeeParams } from "@snowbridge/api";
import { type SnowbridgeClient } from "@/lib/snowbridge";
import { getEnvironmentName } from "@/lib/snowbridgeEnv";
import { parseUnits } from "ethers";
import { fetchTokenPrices } from "@/utils/coindesk";

async function estimateExecutionFee(
  sender: any,
  token: string,
  deliveryFee: any,
) {
  const feeEstimateAccounts: { [env: string]: { src: string; dst: string } } = {
    polkadot_mainnet: {
      src: "0xd803472c47a87d7b63e888de53f03b4191b846a8",
      dst: "5GwwB3hLZP7z5siAtBiF4Eq52nhTfTrDqWLCSjP8G1ZtJqH3",
    },
    westend_sepolia: {
      src: "0x180c269c4a5211aa4bab78abdf6e4d87263febe6",
      dst: "5CcEcgHEHPbQUX4ad5eT5mMoNrER3ftoKxqjfZRT9Xub9SKb",
    },
    paseo_sepolia: {
      src: "0x34e67708f073dda5cb3670826ecc2ac667b44994",
      dst: "5DG4oudPJxUpxTkQ7mR5b1pDrX1EeoFpyMyP9PgDR1DmKEPC",
    },
  };
  const env = getEnvironmentName();
  if (env in feeEstimateAccounts) {
    try {
      const { src: sourceAccount, dst: destAccount } = feeEstimateAccounts[env];
      const testTransfer = await sender.tx(
        sourceAccount,
        destAccount,
        token,
        1n,
        deliveryFee,
      );

      const [estimatedGas, feeData] = await Promise.all([
        (sender.context.ethereum() as any).estimateGas(testTransfer.tx),
        (sender.context.ethereum() as any).getFeeData(),
      ]);
      return (feeData.gasPrice ?? 0n) * estimatedGas;
    } catch (err) {
      console.warn("Could not estimate execution fee:", err);
    }
  }
  return 0n;
}

function resolveFeeDisplayAsset(
  summarySymbol: string,
  source: TransferLocation,
  registry: AssetRegistry,
) {
  switch (summarySymbol) {
    case "ETH":
      return { decimals: 18, symbol: "ETH" };
    case "DOT":
      return {
        decimals: registry.relaychain.tokenDecimals ?? 0,
        symbol: registry.relaychain.tokenSymbols ?? "DOT",
      };
    case "NATIVE":
      return {
        decimals: source.parachain?.info.tokenDecimals ?? 0,
        symbol: source.parachain?.info.tokenSymbols ?? "NATIVE",
      };
    default:
      return { decimals: 0, symbol: summarySymbol };
  }
}

function getSummaryAmount(
  delivery: FeeInfo["delivery"],
  symbol: string,
): bigint | undefined {
  return delivery.summary.find((item) => item.symbol === symbol)?.amount;
}

function getVolumeTip(
  delivery: FeeInfo["delivery"],
  primarySummarySymbol: string,
): bigint | undefined {
  const summaryTip = delivery.summary.find(
    (item) =>
      item.description === "Volume tip" && item.symbol === primarySummarySymbol,
  );
  if (summaryTip) {
    return summaryTip.amount;
  }

  if (
    "volumeTip" in delivery &&
    typeof delivery.volumeTip === "bigint" &&
    primarySummarySymbol === "ETH"
  ) {
    return delivery.volumeTip;
  }

  return undefined;
}

function buildFeeInfo(
  delivery: FeeInfo["delivery"],
  source: TransferLocation,
  registry: AssetRegistry,
  extraTotalFee: bigint = 0n,
): FeeInfo {
  const primary = delivery.summary[0];
  if (!primary) {
    throw new Error(`Delivery fee summary is empty for ${delivery.kind}.`);
  }

  const { decimals, symbol } = resolveFeeDisplayAsset(
    primary.symbol,
    source,
    registry,
  );

  const primaryAmount =
    getSummaryAmount(delivery, primary.symbol) ?? primary.amount;

  return {
    fee: primaryAmount,
    totalFee: primaryAmount + extraTotalFee,
    decimals,
    symbol,
    volumeTip: getVolumeTip(delivery, primary.symbol),
    delivery,
    kind: source.kind,
  };
}

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
]): Promise<FeeInfo | undefined> {
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
    case "ethereum->polkadot": {
      const fee = await sender.fee(token, { volumeFee });
      const estimatedExecution = await estimateExecutionFee(
        sender,
        token,
        fee,
      );
      return buildFeeInfo(fee, source, registry, BigInt(estimatedExecution));
    }
    case "polkadot->ethereum": {
      const fee = source.parachain?.features.supportsV2
        ? await sender.fee(token, {
            feeTokenLocation: assetsV2.DOT_LOCATION,
            volumeFee,
          })
        : await sender.fee(token);
      return buildFeeInfo(fee, source, registry);
    }
    case "ethereum->ethereum": {
      const fee = await sender.fee(token);
      return buildFeeInfo(fee, source, registry);
    }
    case "polkadot->polkadot": {
      const fee = await sender.fee(token);
      return buildFeeInfo(fee, source, registry);
    }
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
      const fee = await sender.fee(l2asset.token, amountInSmallestUnit, {
        volumeFee,
      });
      return buildFeeInfo(fee, source, registry);
    }
    case "polkadot->ethereum_l2": {
      const fee = source.parachain?.features.supportsV2
        ? await sender.fee(token, amountInSmallestUnit, {
            feeTokenLocation: assetsV2.DOT_LOCATION,
            volumeFee,
          })
        : await sender.fee(token, amountInSmallestUnit);
      return buildFeeInfo(fee, source, registry);
    }
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
