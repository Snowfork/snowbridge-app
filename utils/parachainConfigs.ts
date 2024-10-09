import { TransferLocation } from "@snowbridge/api/dist/environment";
import { SwitchPair } from "./types";

export type SnowbridgeEnvironmentNames =
  | "local_e2e"
  | "rococo_sepolia"
  | "polkadot_mainnet"
  | "paseo_sepolia"
  | "westend_sepolia";

export interface ParaConfig {
  id: string;
  name: string;
  nativeTokenMetadata: {
    symbol: string;
    decimals: number;
  };
  switchPair: SwitchPair;
  endpoint: string;
  parachainId: number;
}

type ParaConfigsForSnowEnv = Record<SnowbridgeEnvironmentNames, ParaConfig[]>;

export const parachainConfigs: ParaConfigsForSnowEnv = {
  local_e2e: [],
  westend_sepolia: [],
  polkadot_mainnet: [
    {
      // Kilt on Polkadot
      id: "spiritnet",
      name: "KILT",
      endpoint: "wss://spiritnet.kilt.io/",
      switchPair: [
        {
          id: "assetSwitchPool1",
          tokenMetadata: {
            symbol: "KILT",
            decimals: 15,
            minimumTransferAmount: "33333333",
          },
          xcmFee: {
            symbol: "DOT",
            decimals: 10,
            locationId: "assethub",
            amount: "10000000000",
            remoteXcmFee: {
              V4: {
                id: {
                  parents: 1,
                  interior: "Here",
                },
                fun: {
                  Fungible: 1000000000000,
                },
              },
            },
          },
          remoteAssetId: {
            parents: 2,
            interior: {
              X2: [
                {
                  GlobalConsensus: {
                    Ethereum: {
                      chainId: "1",
                    },
                  },
                },
                {
                  AccountKey20: {
                    network: null,
                    key: "0x5d3d01fd6d2ad1169b17918eb4f153c6616288eb",
                  },
                },
              ],
            },
          },
          remoteReserveLocation: {
            parents: 1,
            interior: {
              X1: [
                {
                  Parachain: 1000,
                },
              ],
            },
          },
        },
      ],
      parachainId: 2086,
      nativeTokenMetadata: {
        symbol: "KILT",
        decimals: 15,
      },
    },
  ],
  rococo_sepolia: [
    {
      // Kilt on rococo_sepolia
      id: "rilt",
      name: "RILT",
      endpoint: "wss://rilt.kilt.io",
      switchPair: [
        {
          id: "assetSwitchPool1",
          tokenMetadata: {
            symbol: "RILT",
            decimals: 15,
            minimumTransferAmount: "10000000000000",
          },
          xcmFee: {
            symbol: "ROC",
            decimals: 10,
            locationId: "assethub",
            amount: "10000000000",
            remoteXcmFee: {
              V4: {
                id: {
                  parents: 1,
                  interior: "Here",
                },
                fun: {
                  Fungible: 1000000000000,
                },
              },
            },
          },
          remoteAssetId: {
            parents: 2,
            interior: {
              X2: [
                {
                  GlobalConsensus: {
                    Ethereum: {
                      chainId: "11155111",
                    },
                  },
                },
                {
                  AccountKey20: {
                    network: null,
                    key: "0x45Ffe5A44Dae5438Ee7FdD26EE5bEFaD13d52832",
                  },
                },
              ],
            },
          },
          remoteReserveLocation: {
            parents: 1,
            interior: {
              X1: [
                {
                  Parachain: 1000,
                },
              ],
            },
          },
        },
      ],
      parachainId: 4504,
      nativeTokenMetadata: {
        symbol: "RILT",
        decimals: 15,
      },
    },
  ],
  paseo_sepolia: [
    {
      // Kilt on paseo_sepolia
      id: "pilt",
      name: "PILT",
      endpoint: "wss://peregrine.kilt.io/parachain-public-ws/",
      switchPair: [
        {
          id: "assetSwitchPool1",
          tokenMetadata: {
            symbol: "PILT",
            decimals: 15,
            minimumTransferAmount: "10000000000000",
          },
          xcmFee: {
            symbol: "PAS",
            decimals: 10,
            locationId: "assethub",
            amount: "5000000000",
            remoteXcmFee: {
              V4: {
                id: {
                  parents: 1,
                  interior: "Here",
                },
                fun: {
                  Fungible: 5000000000,
                },
              },
            },
          },
          remoteAssetId: {
            parents: 2,
            interior: {
              X2: [
                {
                  GlobalConsensus: {
                    Ethereum: {
                      chainId: "11155111",
                    },
                  },
                },
                {
                  AccountKey20: {
                    network: null,
                    key: "0x99E743964C036bc28931Fb564817db428Aa7f752",
                  },
                },
              ],
            },
          },

          remoteReserveLocation: {
            parents: 1,
            interior: {
              X1: [
                {
                  Parachain: 1000,
                },
              ],
            },
          },
        },
      ],
      parachainId: 2086,
      nativeTokenMetadata: {
        symbol: "PILT",
        decimals: 15,
      },
    },
  ],
};
