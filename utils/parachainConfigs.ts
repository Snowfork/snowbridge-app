import { TransferLocation } from "@snowbridge/api/dist/environment";
import { SwitchPair } from "./types";

type SnowbridgeEnvironmentNames =
  | "local_e2e"
  | "rococo_sepolia"
  | "polkadot_mainnet"
  | "paseo_sepolia";

interface ParaConfig {
  name: string;
  nativeTokenMetadata: {
    symbol: string;
    decimals: number;
  };
  pallet: string;
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
  // Kilt on Polkadot
  KILT: {
    name: "KILT",
    snowEnv: "polkadot_mainnet",
    endpoint: "wss://spiritnet.kilt.io/",
    pallet: "assetSwitchPool1",
    switchPair: [
      {
        id: "assetSwitchPool1",
        tokenMetadata: {
          symbol: "KILT",
          decimals: 15,
          address: "0x5d3d01fd6d2ad1169b17918eb4f153c6616288eb",
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
    location: {
      id: "KILT",
      name: "KILT",
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
          address: "0x5d3d01fd6d2ad1169b17918eb4f153c6616288eb",
          minimumTransferAmount: 1n,
        },
      ],
    },
    nativeTokenMetadata: {
      symbol: "KILT",
      decimals: 15,
    },
  },
  // Kilt on rococo_sepolia
  RILT: {
    name: "RILT",
    snowEnv: "rococo_sepolia",
    endpoint: "wss://rilt.kilt.io",
    pallet: "assetSwitchPool1",
    switchPair: [
      {
        id: "assetSwitchPool1",
        tokenMetadata: {
          symbol: "RILT",
          decimals: 15,
          address: "0x45Ffe5A44Dae5438Ee7FdD26EE5bEFaD13d52832",
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
    location: {
      id: "RILT",
      name: "RILT",
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
          address: "0x45Ffe5A44Dae5438Ee7FdD26EE5bEFaD13d52832",
          minimumTransferAmount: 1n,
        },
      ],
    },
    nativeTokenMetadata: {
      symbol: "RILT",
      decimals: 15,
    },
  },
  // Kilt on paseo_sepolia
  PILT: {
    name: "PILT",
    snowEnv: "paseo_sepolia",
    endpoint: "wss://peregrine.kilt.io/parachain-public-ws/",
    pallet: "assetSwitchPool1",
    switchPair: [
      {
        id: "assetSwitchPool1",
        tokenMetadata: {
          symbol: "PILT",
          decimals: 15,
          address: "0x99E743964C036bc28931Fb564817db428Aa7f752",
          minimumTransferAmount: "10000000000000",
        },
        xcmFee: {
          symbol: "PAS",
          decimals: 10,
          locationId: "assethub",
          amount: "500000000",
          remoteXcmFee: {
            V4: {
              id: {
                parents: 1,
                interior: "Here",
              },
              fun: {
                Fungible: 500000000,
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
    location: {
      id: "PILT",
      name: "PILT",
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
          id: "PILT",
          address: "0x99E743964C036bc28931Fb564817db428Aa7f752",
          minimumTransferAmount: 1n,
        },
      ],
    },
    nativeTokenMetadata: {
      symbol: "PILT",
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
