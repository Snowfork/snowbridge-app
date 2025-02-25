import { formatTime } from "@/utils/formatting";
import { u8aToHex } from "@polkadot/util";
import { blake2AsU8a, encodeAddress } from "@polkadot/util-crypto";
import { Context, environment, status, utils } from "@snowbridge/api";
import { AccountInfo } from "./snowbridge";

export const ACCEPTABLE_BRIDGE_LATENCY = 28800; // 8 hours

type StatusValue = "Normal" | "Halted" | "Delayed";
export type BridgeStatus = {
  statusInfo: status.BridgeStatusInfo;
  channelStatusInfos: { name: string; status: status.ChannelStatusInfo }[];
  assetHubChannel: status.ChannelStatusInfo;
  relayers: AccountInfo[];
  accounts: AccountInfo[];
  summary: {
    toPolkadot: {
      lightClientLatencyIsAcceptable: boolean;
      bridgeOperational: boolean;
      channelOperational: boolean;
    };
    toPolkadotOperatingMode: StatusValue;
    toEthereum: {
      bridgeOperational: boolean;
      lightClientLatencyIsAcceptable: boolean;
    };
    toEthereumOperatingMode: StatusValue;
    overallStatus: StatusValue;
  };
};

export async function getBridgeStatus(
  context: Context,
  { config }: environment.SnowbridgeEnvironment,
): Promise<BridgeStatus> {
  console.log("Refreshing bridge status.");
  const assetHubSovereignAddress = utils.paraIdToSovereignAccount(
    "sibl",
    config.ASSET_HUB_PARAID,
  );
  const bridgeHubAgentId = u8aToHex(blake2AsU8a("0x00", 256));
  const bridgeHub = await context.bridgeHub();
  const [
    bridgeStatusInfo,
    assethub,
    primaryGov,
    secondaryGov,
    assetHubSovereignAccountCodec,
    assetHubAgentAddress,
    bridgeHubAgentAddress,
  ] = await Promise.all([
    status.bridgeStatusInfo(context),
    status.channelStatusInfo(
      context,
      utils.paraIdToChannelId(config.ASSET_HUB_PARAID),
    ),
    status.channelStatusInfo(context, config.PRIMARY_GOVERNANCE_CHANNEL_ID),
    status.channelStatusInfo(context, config.SECONDARY_GOVERNANCE_CHANNEL_ID),
    bridgeHub.query.system.account(assetHubSovereignAddress),
    context
      .gateway()
      .agentOf(
        utils.paraIdToAgentId(bridgeHub.registry, config.ASSET_HUB_PARAID),
      ),
    context.gateway().agentOf(bridgeHubAgentId),
  ]);

  const accounts: AccountInfo[] = [];
  const assetHubSovereignBalance = BigInt(
    (assetHubSovereignAccountCodec.toPrimitive() as any).data.free,
  );
  accounts.push({
    name: "Asset Hub Sovereign",
    type: "substrate",
    account: encodeAddress(assetHubSovereignAddress),
    balance: assetHubSovereignBalance.toString(),
  });

  const [assetHubAgentBalance, bridgeHubAgentBalance, relayers] =
    await Promise.all([
      context.ethereum().getBalance(assetHubAgentAddress),
      context.ethereum().getBalance(bridgeHubAgentAddress),
      Promise.all(
        config.RELAYERS.map(async (r) => {
          let balance = "0";
          switch (r.type) {
            case "ethereum":
              balance = (
                await context.ethereum().getBalance(r.account)
              ).toString();
              break;
            case "substrate":
              balance = BigInt(
                (
                  (
                    await bridgeHub.query.system.account(r.account)
                  ).toPrimitive() as any
                ).data.free,
              ).toString();
              break;
          }
          return {
            name: r.name,
            account: r.account,
            balance: balance,
            type: r.type,
          };
        }),
      ),
    ]);

  accounts.push({
    name: "Asset Hub Agent",
    type: "ethereum",
    account: assetHubAgentAddress,
    balance: assetHubAgentBalance.toString(),
  });
  accounts.push({
    name: "Bridge Hub Agent",
    type: "ethereum",
    account: bridgeHubAgentAddress,
    balance: bridgeHubAgentBalance.toString(),
  });

  const toPolkadot = {
    lightClientLatencyIsAcceptable:
      bridgeStatusInfo.toPolkadot.latencySeconds < ACCEPTABLE_BRIDGE_LATENCY,
    bridgeOperational:
      bridgeStatusInfo.toPolkadot.operatingMode.outbound === "Normal" &&
      bridgeStatusInfo.toPolkadot.operatingMode.beacon === "Normal",
    channelOperational: assethub.toPolkadot.operatingMode.outbound === "Normal",
  };
  const toPolkadotOperatingMode =
    !toPolkadot.bridgeOperational || !toPolkadot.channelOperational
      ? "Halted"
      : !toPolkadot.lightClientLatencyIsAcceptable
        ? "Delayed"
        : "Normal";

  const toEthereum = {
    bridgeOperational:
      bridgeStatusInfo.toEthereum.operatingMode.outbound === "Normal",
    lightClientLatencyIsAcceptable:
      bridgeStatusInfo.toEthereum.latencySeconds < ACCEPTABLE_BRIDGE_LATENCY,
  };
  const toEthereumOperatingMode = !toEthereum.bridgeOperational
    ? "Halted"
    : !toEthereum.lightClientLatencyIsAcceptable
      ? "Delayed"
      : "Normal";

  let overallStatus: StatusValue = toEthereumOperatingMode;
  if (toEthereumOperatingMode === "Normal") {
    overallStatus = toPolkadotOperatingMode;
  }

  return {
    summary: {
      toPolkadot,
      toPolkadotOperatingMode,
      toEthereum,
      toEthereumOperatingMode,
      overallStatus,
    },
    statusInfo: bridgeStatusInfo,
    assetHubChannel: assethub,
    channelStatusInfos: [
      { name: "Asset Hub", status: assethub },
      { name: "Primary Governance", status: primaryGov },
      { name: "Secondary Governance", status: secondaryGov },
    ],
    relayers,
    accounts,
  };
}

export function estimateDelivery(
  source: environment.SourceType,
  status: BridgeStatus | null,
) {
  if (!status) return "Calculating...";
  switch (source) {
    case "ethereum": {
      if ((status.assetHubChannel.toPolkadot as any).estimatedDeliveryTime) {
        return formatTime(
          (status.assetHubChannel.toPolkadot as any).estimatedDeliveryTime,
          false,
        );
      }
      const EPOCH_TIME = 6.4 * 60;
      let estimatedSeconds =
        EPOCH_TIME * 5 - status.statusInfo.toPolkadot.latencySeconds;
      if (estimatedSeconds < 0) {
        estimatedSeconds = EPOCH_TIME * 3 - estimatedSeconds;
      }
      return formatTime(estimatedSeconds, false);
    }
    case "substrate": {
      if ((status.statusInfo.toEthereum as any).estimatedDeliveryTime) {
        return formatTime(
          (status.statusInfo.toEthereum as any).estimatedDeliveryTime,
          false,
        );
      }
      const MAX_BEEFY_DELIVERY_TIME = 60 * 60 * 4.5;
      let estimatedSeconds =
        MAX_BEEFY_DELIVERY_TIME - status.statusInfo.toEthereum.latencySeconds;
      if (estimatedSeconds < 0) {
        estimatedSeconds = MAX_BEEFY_DELIVERY_TIME - estimatedSeconds;
      }
      return formatTime(estimatedSeconds, false);
    }
    default:
      return "Could not estimate.";
  }
}
