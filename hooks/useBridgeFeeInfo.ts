import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  assetsV2,
  forInterParachain,
  toEthereumV2,
  toEthereumSnowbridgeV2,
  toPolkadotSnowbridgeV2,
  toPolkadotV2,
  toKusamaSnowbridgeV2,
  fromKusamaSnowbridgeV2,
  toEthereumFromEVMV2,
} from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { FeeInfo } from "@/utils/types";
import { useContext } from "react";
import { BridgeInfoContext } from "@/app/providers";
import {
  AssetRegistry,
  BridgeInfo,
  Parachain,
  TransferLocation,
  TransferRoute,
} from "@snowbridge/base-types";
import { AppContext, getEnvironmentName } from "@/lib/snowbridge";
import { bridgeInfoFor } from "@snowbridge/registry";
import { parseUnits } from "ethers";
import { inferTransferType } from "@/utils/inferTransferType";

function buildRoute(
  source: TransferLocation,
  destination: TransferLocation,
): TransferRoute {
  return {
    from: { kind: source.kind, id: source.id },
    to: { kind: destination.kind, id: destination.id },
    assets: [],
  };
}

async function estimateExecutionFee(
  context: AppContext,
  registry: AssetRegistry,
  para: Parachain,
  deliveryFee: toPolkadotSnowbridgeV2.DeliveryFee,
  source: TransferLocation,
  destination: TransferLocation,
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

      const useV2 = assetsV2.supportsEthereumToPolkadotV2(para);
      const route = buildRoute(source, destination);
      const sourceEthChain =
        registry.ethereumChains[`ethereum_${source.id}`];

      let testTransfer;
      if (useV2) {
        const transferImpl = new toPolkadotSnowbridgeV2.TransferToPolkadot(
          context,
          route,
          registry,
          sourceEthChain,
          para,
        );
        testTransfer = await transferImpl.tx(
          sourceAccount,
          destAccount,
          assetsV2.ETHER_TOKEN_ADDRESS,
          1n,
          deliveryFee,
        );
      } else {
        const transferImpl = new toPolkadotV2.V1ToPolkadotAdapter(
          context,
          registry,
          route,
          sourceEthChain,
          para,
        );
        testTransfer = await transferImpl.tx(
          sourceAccount,
          destAccount,
          assetsV2.ETHER_TOKEN_ADDRESS,
          1n,
          deliveryFee,
        );
      }

      const [estimatedGas, feeData] = await Promise.all([
        context.ethereum().estimateGas(testTransfer.tx),
        context.ethereum().getFeeData(),
      ]);
      return (feeData.gasPrice ?? 0n) * estimatedGas;
    } catch (err) {
      console.warn("Could not estimate execution fee:", err);
    }
  }
  return 0n;
}

async function fetchBridgeFeeInfo([
  context,
  source,
  destination,
  registry,
  token,
  amount,
]: [
  AppContext | null,
  TransferLocation,
  TransferLocation,
  AssetRegistry,
  string,
  string,
]): Promise<FeeInfo | undefined> {
  if (context === null) {
    return;
  }
  const asset =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[token];

  const amountInSmallestUnit = parseUnits(
    amount || amount.trim() !== "" ? amount.trim() : "0",
    asset.decimals,
  );

  const transferType = inferTransferType(source, destination);
  const route = buildRoute(source, destination);

  switch (transferType) {
    case "ethereum->polkadot": {
      const para = registry.parachains[`polkadot_${destination.id}`];
      const useV2 = assetsV2.supportsEthereumToPolkadotV2(para);
      const sourceEthChain =
        registry.ethereumChains[`ethereum_${source.id}`];

      let transferImpl;
      if (useV2) {
        transferImpl = new toPolkadotSnowbridgeV2.TransferToPolkadot(
          context,
          route,
          registry,
          sourceEthChain,
          para,
        );
      } else {
        transferImpl = new toPolkadotV2.V1ToPolkadotAdapter(
          context,
          registry,
          route,
          sourceEthChain,
          para,
        );
      }

      const fee = await transferImpl.fee(token);
      const estimatedExecution: bigint = await estimateExecutionFee(
        context,
        registry,
        para,
        fee,
        source,
        destination,
      );
      return {
        fee: fee.totalFeeInWei,
        totalFee: fee.totalFeeInWei + estimatedExecution,
        decimals: 18,
        symbol: "ETH",
        delivery: { ...fee, kind: transferType } as FeeInfo["delivery"],
        kind: source.kind,
      };
    }
    case "ethereum->ethereum":
    case "polkadot->ethereum": {
      const sourceParachain = source.parachain!;
      const useV2 = assetsV2.supportsPolkadotToEthereumV2(sourceParachain);

      let transferImpl;
      if (transferType === "ethereum->ethereum") {
        const sourceEthChain =
          registry.ethereumChains[`ethereum_${source.id}`];
        const destEthChain =
          registry.ethereumChains[`ethereum_${destination.id}`];
        transferImpl = new toEthereumFromEVMV2.V1ToEthereumEvmAdapter(
          context,
          registry,
          route,
          sourceEthChain,
          destEthChain,
        );
      } else if (useV2) {
        const destEthChain =
          registry.ethereumChains[`ethereum_${destination.id}`];
        transferImpl = new toEthereumSnowbridgeV2.TransferToEthereum(
          context,
          route,
          registry,
          sourceParachain,
          destEthChain,
        );
      } else {
        const destEthChain =
          registry.ethereumChains[`ethereum_${destination.id}`];
        transferImpl = new toEthereumV2.V1ToEthereumAdapter(
          context,
          registry,
          route,
          sourceParachain,
          destEthChain,
        );
      }

      const fee = await transferImpl.fee(token);

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
        delivery: { ...fee, kind: transferType } as FeeInfo["delivery"],
        kind: source.kind,
      };
    }
    case "polkadot->polkadot": {
      const bridgeInfo: BridgeInfo = bridgeInfoFor(getEnvironmentName());
      const sourceParachain = source.parachain!;
      const destParachain = destination.parachain!;

      const transferImpl = new forInterParachain.InterParachainTransfer(
        bridgeInfo,
        context,
        route,
        sourceParachain,
        destParachain,
      );

      const fee = await transferImpl.fee(token);

      let feeValue = fee.totalFeeInDot;
      let decimals = registry.relaychain.tokenDecimals ?? 0;
      let symbol = registry.relaychain.tokenSymbols ?? "";
      return {
        fee: feeValue,
        totalFee: feeValue,
        decimals,
        symbol,
        delivery: { ...fee, kind: transferType } as FeeInfo["delivery"],
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
      const sourceEthChain =
        registry.ethereumChains[`ethereum_l2_${source.id}`];
      const destParachain =
        registry.parachains[`polkadot_${destination.id}`];

      // Import the L2->Polkadot transfer class from the sub-path
      const { ERC20ToAH } = await import(
        "@snowbridge/api/dist/transfers/l2ToPolkadot/erc20ToAH"
      );
      const l2TransferImpl = new ERC20ToAH(
        context,
        registry,
        route,
        sourceEthChain,
        destParachain,
      );
      const fee = await l2TransferImpl.fee(l2asset.token, amountInSmallestUnit);
      return {
        fee: fee.totalFeeInWei,
        totalFee: fee.totalFeeInWei,
        decimals: 18,
        symbol: "ETH",
        delivery: { ...fee, kind: transferType } as FeeInfo["delivery"],
        kind: source.kind,
      };
    }
    case "ethereum->kusama": {
      const kusamaPara =
        registry.kusama?.parachains[`kusama_${destination.id}`];
      if (!kusamaPara)
        throw Error(`Kusama parachain ${destination.id} not found in registry.`);
      const sourceEthChain =
        registry.ethereumChains[`ethereum_${source.id}`];
      const transferImpl = new toKusamaSnowbridgeV2.TransferToKusama(
        context,
        route,
        registry,
        sourceEthChain,
        kusamaPara,
      );
      const fee = await transferImpl.fee(token);
      return {
        fee: fee.totalFeeInWei,
        totalFee: fee.totalFeeInWei,
        decimals: 18,
        symbol: "ETH",
        delivery: { ...fee, kind: transferType } as FeeInfo["delivery"],
        kind: source.kind,
      };
    }
    case "kusama->ethereum": {
      const kusamaPara = registry.kusama?.parachains[`kusama_${source.id}`];
      if (!kusamaPara)
        throw Error(`Kusama parachain ${source.id} not found in registry.`);
      const destEthChain =
        registry.ethereumChains[`ethereum_${destination.id}`];
      const transferImpl = new fromKusamaSnowbridgeV2.TransferFromKusama(
        context,
        route,
        registry,
        kusamaPara,
        destEthChain,
      );
      const fee = await transferImpl.fee(token);
      return {
        fee: fee.totalFeeInKSM,
        totalFee: fee.totalFeeInKSM,
        decimals: kusamaPara.info.tokenDecimals,
        symbol: kusamaPara.info.tokenSymbols,
        delivery: { ...fee, kind: transferType } as FeeInfo["delivery"],
        kind: source.kind,
      };
    }
    case "polkadot->ethereum_l2": {
      const sourceParachain = source.parachain!;
      const destEthChain =
        registry.ethereumChains[`ethereum_l2_${destination.id}`];

      // Import the Polkadot->L2 transfer class from the sub-path
      const { ERC20FromAH } = await import(
        "@snowbridge/api/dist/transfers/polkadotToL2/erc20ToL2"
      );
      const l2TransferImpl = new ERC20FromAH(
        context,
        registry,
        route,
        sourceParachain,
        destEthChain,
      );
      const fee = await l2TransferImpl.fee(token, amountInSmallestUnit);
      let feeValue = fee.totalFeeInDot;
      let decimals = registry.relaychain.tokenDecimals ?? 0;
      let symbol = registry.relaychain.tokenSymbols ?? "";
      return {
        fee: feeValue,
        totalFee: feeValue,
        decimals,
        symbol,
        delivery: { ...fee, kind: transferType } as FeeInfo["delivery"],
        kind: source.kind,
      };
    }
    default:
      throw Error(`Unknown transfer type ${transferType}`);
  }
}

export function useBridgeFeeInfo(
  source: TransferLocation,
  destination: TransferLocation,
  token: string,
  amount: string,
) {
  if (amount === undefined) throw Error(`abc`);
  const context = useAtomValue(snowbridgeContextAtom);
  const { registry } = useContext(BridgeInfoContext)!;
  return useSWR(
    [context, source, destination, registry, token, amount, "feeInfo"],
    fetchBridgeFeeInfo,
    {
      errorRetryCount: 30,
    },
  );
}
