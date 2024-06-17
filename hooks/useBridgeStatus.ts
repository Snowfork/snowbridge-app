"use client";

import { blake2AsU8a, encodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { status, Context, utils } from "@snowbridge/api";
import useSWR from "swr";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import { useAtomValue } from "jotai";
import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { ethereumChainIdAtom } from "@/store/ethereum";

export const REFRESH_INTERVAL: number = 5 * 60 * 1000; // 5 minutes
export const ERROR_RETRY_INTERVAL: number = 1 * 60 * 1000; // 1 minute

const ACCEPTABLE_BRIDGE_LATENCY = 28800; // 8 hours

export interface AccountInfo {
  name: string;
  type: "ethereum" | "substrate";
  account: string;
  balance: bigint;
}

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

const fetchStatus = async ([env, context, chainId]: [
  SnowbridgeEnvironment,
  Context | null,
  number | null,
]): Promise<BridgeStatus | null> => {
  try {
    const { config } = env;

    if (context === null) return null;
    if (chainId === null) return null;
    if (chainId !== env.ethChainId) return null;

    console.log("Refreshing bridge status.");
    const assetHubSovereignAddress = utils.paraIdToSovereignAccount(
      "sibl",
      config.ASSET_HUB_PARAID,
    );
    const bridgeHubAgentId = u8aToHex(blake2AsU8a("0x00", 256));

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
      context.polkadot.api.bridgeHub.query.system.account(
        assetHubSovereignAddress,
      ),
      context.ethereum.contracts.gateway.agentOf(
        utils.paraIdToAgentId(
          context.polkadot.api.bridgeHub.registry,
          config.ASSET_HUB_PARAID,
        ),
      ),
      context.ethereum.contracts.gateway.agentOf(bridgeHubAgentId),
    ]);

    const accounts: AccountInfo[] = [];
    const assetHubSovereignBalance = BigInt(
      (assetHubSovereignAccountCodec.toPrimitive() as any).data.free,
    );
    accounts.push({
      name: "Asset Hub Sovereign",
      type: "substrate",
      account: encodeAddress(assetHubSovereignAddress),
      balance: assetHubSovereignBalance,
    });

    const [assetHubAgentBalance, bridgeHubAgentBalance, relayers] =
      await Promise.all([
        context.ethereum.api.getBalance(assetHubAgentAddress),
        context.ethereum.api.getBalance(bridgeHubAgentAddress),
        Promise.all(
          config.RELAYERS.map(async (r) => {
            let balance = 0n;
            switch (r.type) {
              case "ethereum":
                balance = await context.ethereum.api.getBalance(r.account);
                break;
              case "substrate":
                balance = BigInt(
                  (
                    (
                      await context.polkadot.api.bridgeHub.query.system.account(
                        r.account,
                      )
                    ).toPrimitive() as any
                  ).data.free,
                );
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
      balance: assetHubAgentBalance,
    });
    accounts.push({
      name: "Bridge Hub Agent",
      type: "ethereum",
      account: bridgeHubAgentAddress,
      balance: bridgeHubAgentBalance,
    });

    const toPolkadot = {
      lightClientLatencyIsAcceptable:
        bridgeStatusInfo.toPolkadot.latencySeconds < ACCEPTABLE_BRIDGE_LATENCY,
      bridgeOperational:
        bridgeStatusInfo.toPolkadot.operatingMode.outbound === "Normal" &&
        bridgeStatusInfo.toPolkadot.operatingMode.beacon === "Normal",
      channelOperational:
        assethub.toPolkadot.operatingMode.outbound === "Normal",
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
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const useBridgeStatus = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const chainId = useAtomValue(ethereumChainIdAtom);
  return useSWR([env, context, chainId, "bridgeStatus"], fetchStatus, {
    refreshInterval: REFRESH_INTERVAL,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    suspense: true,
    fallbackData: null,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};
