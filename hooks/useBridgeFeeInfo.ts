import { snowbridgeApiAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { FeeInfo } from "@/utils/types";
import { useContext } from "react";
import { BridgeInfoContext } from "@/app/providers";
import { AssetRegistry, TransferLocation } from "@snowbridge/base-types";
import { type SnowbridgeClient } from "@/lib/snowbridge";
import { getEnvironmentName } from "@/lib/snowbridgeEnv";
import { parseUnits } from "ethers";

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
    amount || amount.trim() !== "" ? amount.trim() : "0",
    asset.decimals,
  );

  const sender = api.sender(source, destination);

  switch (sender.kind) {
    case "ethereum->polkadot": {
      const fee = await sender.fee(token);
      const estimatedExecution = await estimateExecutionFee(
        sender,
        token,
        fee,
      );
      return {
        fee: fee.totalFeeInWei,
        totalFee: fee.totalFeeInWei + BigInt(estimatedExecution),
        decimals: 18,
        symbol: "ETH",
        delivery: fee,
        kind: source.kind,
      };
    }
    case "ethereum->ethereum":
    case "polkadot->ethereum": {
      const fee = await sender.fee(token);

      let feeValue = fee.totalFeeInDot;
      let decimals = registry.relaychain.tokenDecimals ?? 0;
      let symbol = registry.relaychain.tokenSymbols ?? "";
      if (fee.totalFeeInNative) {
        feeValue = fee.totalFeeInNative;
        decimals = source.parachain!.info.tokenDecimals;
        symbol = source.parachain!.info.tokenSymbols;
      }
      return {
        fee: feeValue,
        totalFee: feeValue,
        decimals,
        symbol,
        delivery: fee,
        kind: source.kind,
      };
    }
    case "polkadot->polkadot": {
      const fee = await sender.fee(token);
      let feeValue = fee.totalFeeInDot;
      let decimals = registry.relaychain.tokenDecimals ?? 0;
      let symbol = registry.relaychain.tokenSymbols ?? "";
      return {
        fee: feeValue,
        totalFee: feeValue,
        decimals,
        symbol,
        delivery: fee,
        kind: source.kind,
      };
    }
    case "ethereum_l2->polkadot": {
      if (source.kind !== "ethereum_l2")
        throw `Invalid source ${source.key}, expected ethereum_l2 source.`;
      const l2asset = Object.values(source.ethChain.assets).find(
        (x) => x.swapTokenAddress?.toLowerCase() === token.toLowerCase(),
      );
      if (!l2asset)
        throw Error(`Could not find l2 token for l1 token ${token}`);
      const fee = await sender.fee(l2asset.token, amountInSmallestUnit);
      // TODO: fee information
      //fee.bridgeFeeInL2Token
      //fee.swapFeeInL1Token
      return {
        fee: fee.totalFeeInWei,
        totalFee: fee.totalFeeInWei,
        decimals: 18,
        symbol: "ETH",
        delivery: fee,
        kind: source.kind,
      };
    }
    case "polkadot->ethereum_l2": {
      const fee = await sender.fee(token, amountInSmallestUnit);
      let feeValue = fee.totalFeeInDot;
      let decimals = registry.relaychain.tokenDecimals ?? 0;
      let symbol = registry.relaychain.tokenSymbols ?? "";
      return {
        fee: feeValue,
        totalFee: feeValue,
        decimals,
        symbol,
        delivery: fee,
        kind: source.kind,
      };
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
