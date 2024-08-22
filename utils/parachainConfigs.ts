import { TransferLocation } from "@snowbridge/api/dist/environment";

type SnowbridgeEnvironmentNames =
  | "local_e2e"
  | "rococo_sepolia"
  | "polkadot_mainnet";

interface ParaConfig {
  name: string;
  snowEnv: SnowbridgeEnvironmentNames;
  endpoint: string;
  pallet: string;
  parachainId: number;
  location: TransferLocation;
}

interface RegisterOfParaConfigs {
  [name: string]: ParaConfig;
}

export const parachainConfigs: RegisterOfParaConfigs = {
  // Kilt on Polkadot
  Kilt: {
    name: "Kilt",
    snowEnv: "polkadot_mainnet",
    endpoint: "wss://kilt.dotters.network",
    pallet: "assetSwitchPool1",
    parachainId: 2086,
    location: {
      id: "kilt",
      name: "Kilt",
      type: "substrate",
      destinationIds: ["assethub"],
      paraInfo: {
        paraId: 2086,
        destinationFeeDOT: 0n,
        skipExistentialDepositCheck: false,
        addressType: "32byte",
        decimals: 15,
        maxConsumers: 16,
      },
      erc20tokensReceivable: [
        {
          id: "KILT",
          address: "", // not existent yet
          minimumTransferAmount: 1n,
        },
      ],
    },
  },
  // Kilt on Rococo
  Rilt: {
    name: "Rilt",
    snowEnv: "rococo_sepolia",
    endpoint: "wss://rilt.kilt.io",
    pallet: "assetSwitchPool1",
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
          id: "RILT",
          address: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
          minimumTransferAmount: 1n,
        },
      ],
    },
  },
};
