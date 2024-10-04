import { parachainNativeAsset } from "@snowbridge/api/dist/assets";
import {
  SNOWBRIDGE_ENV,
  TransferLocation,
} from "@snowbridge/api/dist/environment";
// eslint-disable-next-line import/no-extraneous-dependencies
import { IERC20Metadata__factory } from "@snowbridge/contract-types";

import { getEtherApi, getSubstApi } from "./getApi";
import { getAddressType, getSnowEnvBasedOnRelayChain } from "./paraUtils";

/** Mock up from:
 *
 *  const snowbridgeEnvironmentNames = Object.keys(SNOWBRIDGE_ENV) as Array<string>;
 *
 *  type SnowbridgeEnvironmentNames = (typeof snowbridgeEnvironmentNames)[number]; */
type SnowbridgeEnvironmentNames =
  | "local_e2e"
  | "rococo_sepolia"
  | "polkadot_mainnet"
  | "unsupported_relaychain";

interface ParaConfig {
  name: string;
  snowEnv: SnowbridgeEnvironmentNames;
  endpoint: string;
  pallet: string;
  parachainId: number;
  location: TransferLocation;
}

export interface RegisterOfParaConfigs {
  [name: string]: ParaConfig;
}
/**
 * Gets all necessary Information about a _Substrate_ parachain to extend the Snowbridge Environment with it.
 *
 * It gathers information from a node of the parachain under `paraEndpoint` and the contract on the ethereum side through and _Alchemy_ node.
 *
 * If the name of the Switch Pallet is not passed, it assumes that first switch pool is between native token and its erc20 wrapped counterpart.
 *
 * @param paraEndpoint Endpoint of a Substrate Parachain Node.
 * @param etherApiKey API Key to use connect to ether-node through Alchemy.
 * @param switchPalletName Name of wished switch pallet on the parachain itself.
 * @returns necessary data to extend the _Snowbridge Environment_ or `void` on failure.
 */
export async function buildParachainConfig(
  paraEndpoint: string,
  etherApiKey: string,
  switchPalletName: string = "assetSwitchPool1",
): Promise<ParaConfig | void> {
  const paraApi = await getSubstApi(paraEndpoint);

  if (!paraApi) {
    console.log(`Could not connect to parachain API under "${paraEndpoint}"`);
    return;
  }

  const paraId = (
    await paraApi.query.parachainInfo.parachainId()
  ).toPrimitive() as number;

  // Get information about the token on it's native parachain
  const chainName = (await paraApi.rpc.system.chain()).toString();
  const snowBridgeEnvName = (await getSnowEnvBasedOnRelayChain(
    paraApi,
    SNOWBRIDGE_ENV,
  )) as SnowbridgeEnvironmentNames;

  if (snowBridgeEnvName === "unsupported_relaychain") {
    // error message already logged from getSnowEnvBasedOnRelayChain()
    return;
  }

  // debugger
  console.log("snowBridgeEnvName: ", snowBridgeEnvName);

  /** The Snowbridge team decided to set the amount of the existential deposit as the minimal transfer amount. */
  const minimumTransferAmount = BigInt(
    paraApi.consts.balances.existentialDeposit.toString(),
  );

  const { tokenDecimal } = await parachainNativeAsset(paraApi);

  const addressType = await getAddressType(paraApi);

  // debugger
  console.log(`The address type used is: ${addressType}`);

  // Get information about the wrapped erc20 token from parachain
  const switchPair = await paraApi.query[switchPalletName].switchPair();
  const contractAddress = (switchPair as any).unwrap().remoteAssetId.toJSON().v4
    .interior.x2[1].accountKey20.key;

  const xcmFee = (switchPair as any).unwrap().remoteXcmFee.toJSON().v4.fun
    .fungible as number;

  // debuggers
  console.log("contractAddress: ", contractAddress);
  console.log("xcmFee: ", xcmFee);

  // Get information about the wrapped erc20 token from ethereum
  const etherEndpoint =
    SNOWBRIDGE_ENV[snowBridgeEnvName].config.ETHEREUM_API(etherApiKey);
  const etherApi = await getEtherApi(etherEndpoint);

  if (!etherApi) {
    console.log(`Could not connect to ethereum API under "${etherEndpoint}"`);
    return;
  }

  const ercTokenMetadata = IERC20Metadata__factory.connect(
    contractAddress,
    etherApi,
  );
  const ercSymbol = await ercTokenMetadata.symbol();

  paraApi.disconnect();
  etherApi.destroy();

  return {
    name: chainName,
    snowEnv: snowBridgeEnvName,
    endpoint: paraEndpoint,
    pallet: switchPalletName,
    parachainId: paraId,
    location: {
      id: chainName.toLowerCase().replaceAll(/\s/g, ""),
      name: chainName,
      type: "substrate",
      destinationIds: ["assethub"],
      paraInfo: {
        paraId: paraId,
        destinationFeeDOT: BigInt(xcmFee),
        skipExistentialDepositCheck: false,
        addressType: addressType,
        decimals: tokenDecimal,
        maxConsumers: 16,
      },
      erc20tokensReceivable: [
        {
          id: ercSymbol,
          address: contractAddress,
          minimumTransferAmount,
        },
      ],
    },
  };
}
