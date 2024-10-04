import { ApiPromise } from "@polkadot/api";
import { Bytes, Option, Struct, TypeDefInfo, u32 } from "@polkadot/types";
import { H256 } from "@polkadot/types/interfaces";

import {
  AddressType,
  SnowbridgeEnvironment,
} from "@snowbridge/api/dist/environment";

import { getSubstApi } from "./getApi";

// explicit Definition:
interface PolkadotPrimitivesV5PersistedValidationData extends Struct {
  readonly parentHead: Bytes;
  readonly relayParentNumber: u32;
  readonly relayParentStorageRoot: H256;
  readonly maxPovSize: u32;
}

async function getRelaysChainLastParentBlockInfo(api: ApiPromise) {
  const validationData =
    await api.query.parachainSystem.validationData<
      Option<PolkadotPrimitivesV5PersistedValidationData>
    >();

  if (validationData.isNone) {
    throw new Error(
      "This is not a parachain or validation data is unavailable",
    );
  }
  const { relayParentNumber, relayParentStorageRoot } = validationData.unwrap();

  const lastRelayParentBlock = relayParentNumber.toNumber();
  const lastRelayParentBlockStorageRoot = relayParentStorageRoot.toHex();

  //   console.log("lastRelayParentBlock: ", lastRelayParentBlock);
  //   console.log(
  //     "lastRelayParentBlockStorageRoot: ",
  //     lastRelayParentBlockStorageRoot,
  //   );

  return {
    lastRelayParentBlock,
    lastRelayParentBlockStorageRoot,
  };
}

/** Returns to which `SnowbridgeEnvironment` the parachain under the give `paraApi` corresponds to. */
export async function getSnowEnvBasedOnRelayChain(
  paraApi: ApiPromise,
  snowEnvironments: { [id: string]: SnowbridgeEnvironment },
) {
  const { lastRelayParentBlock, lastRelayParentBlockStorageRoot } =
    await getRelaysChainLastParentBlockInfo(paraApi);

  const parachainName = await paraApi.rpc.system.chain();

  const coldEnvironments = Object.values(snowEnvironments);

  for await (const env of coldEnvironments) {
    const relayApi = await getSubstApi(env.config.RELAY_CHAIN_URL);

    if (!relayApi) {
      continue;
    }

    const examinedBlockHash =
      await relayApi.rpc.chain.getBlockHash(lastRelayParentBlock);

    const examinedBlock = await relayApi.rpc.chain.getBlock(examinedBlockHash);
    const relaychainName = await relayApi.rpc.system.chain();

    await relayApi.disconnect();

    if (
      examinedBlock.block.header.stateRoot.toHex() ===
      lastRelayParentBlockStorageRoot
    ) {
      console.log(`"${parachainName}" relays on chain: ${relaychainName}`);
      return env.name;
    }
    console.log(
      `"${parachainName}" does not relay on chain: ${relaychainName}`,
    );
  }

  console.log(
    `"${parachainName}" relays on a blockchain that is not part of the Snowbridge API.`,
  );

  return "unsupported_relaychain";
}

export async function getAddressType(api: ApiPromise): Promise<AddressType> {
  // Assume that the first type defined in the runtime is the AccountId
  const lookedUpType = api.registry.lookup.getTypeDef(0);
  if (lookedUpType.type === "AccountId32") {
    return "32byte";
  }

  if (lookedUpType.type === "AccountId20") {
    return "20byte";
  }

  if (lookedUpType.info === TypeDefInfo.VecFixed) {
    const length = lookedUpType.length;
    if (length === 20) {
      return "20byte";
    }
    if (length === 32) {
      return "32byte";
    }
  }
  return "both";
}
