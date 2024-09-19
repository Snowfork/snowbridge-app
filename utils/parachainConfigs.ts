import { TransferLocation } from "@snowbridge/api/dist/environment";
import { bigint } from "zod";

type SnowbridgeEnvironmentNames =
  | "local_e2e"
  | "rococo_sepolia"
  | "polkadot_mainnet";
type SwitchPair = Array<{
  id: string;
  tokenMetadata: {
    symbol: string;
    decimals: number;
    address: string;
    minimumTransferAmount: BigInt;
  };
  xcmFee: {
    symbol: string;
    decimals: number;
    locationId: string;
    amount: bigint;
  };
}>;

interface ParaConfig {
  name: string;
  nativeTokenMetadata: {
    symbol: string;
    decimals: number;
  };
  switchPair: SwitchPair;
  snowEnv: SnowbridgeEnvironmentNames;
  endpoint: string;
  parachainId: number;
  location: TransferLocation;
}

interface RegisterOfParaConfigs {
  [name: string]: ParaConfig;
}

export const parachainConfigs: RegisterOfParaConfigs = {
  // // Kilt on Polkadot
  // Kilt: {
  //   name: "Kilt",
  //   snowEnv: "polkadot_mainnet",
  //   endpoint: "wss://kilt.dotters.network",
  //   pallet: "assetSwitchPool1",
  //   tokenMetadata: {
  //     symbol: "wRILT",
  //     decimals: 15,
  //     address: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
  //   },
  //   parachainId: 2086,
  //   location: {
  //     id: "kilt",
  //     name: "Kilt",
  //     type: "substrate",
  //     destinationIds: ["assethub"],
  //     paraInfo: {
  //       paraId: 2086,
  //       destinationFeeDOT: 0n,
  //       skipExistentialDepositCheck: false,
  //       addressType: "32byte",
  //       decimals: 15,
  //       maxConsumers: 16,
  //     },
  //     erc20tokensReceivable: [
  //       {
  //         id: "wKILT",
  //         address: "", // not existent yet
  //         minimumTransferAmount: 1n,
  //       },
  //     ],
  //   },
  // },
  // Kilt on Rococo
  Rilt: {
    name: "Rilt",
    snowEnv: "rococo_sepolia",
    endpoint: "wss://peregrine.kilt.io/parachain-public-ws/",
    switchPair: [
      {
        id: "assetSwitchPool1",
        tokenMetadata: {
          symbol: "wRILT",
          decimals: 15,
          address: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
          minimumTransferAmount: BigInt(10000000000000),
        },
        xcmFee: {
          symbol: "ROC",
          decimals: 10,
          locationId: "assethub",
          amount: BigInt(10000000000),
        },
      },
    ],
    parachainId: 4504,
    location: {
      id: "rilt",
      name: "Rilt",
      type: "substrate",
      destinationIds: ["assethub"],
      paraInfo: {
        paraId: 4504,
        destinationFeeDOT: 0n,
        skipExistentialDepositCheck: false,
        addressType: "32byte",
        decimals: 15,
        maxConsumers: 16,
      },
      erc20tokensReceivable: [
        {
          id: "wRILT",
          address: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
          minimumTransferAmount: 1n,
        },
      ],
    },
    nativeTokenMetadata: {
      symbol: "RILT",
      decimals: 15,
    },
  },
};

export function filterParachainLocations(locations: TransferLocation[]) {
  const parachainLocationIds = Object.values(parachainConfigs).map(
    ({ location }) => location.id,
  );
  const filteredLocations = locations.filter(
    ({ id }) => !parachainLocationIds.includes(id),
  );
  return filteredLocations;
}
