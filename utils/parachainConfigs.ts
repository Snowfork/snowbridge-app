import { TransferLocation } from "@snowbridge/api/dist/environment";

type SnowbridgeEnvironmentNames =
  | "local_e2e"
  | "rococo_sepolia"
  | "polkadot_mainnet"
  | "paseo_sepolia";
type SwitchPair = Array<{
  id: string;
  tokenMetadata: {
    symbol: string;
    decimals: number;
    address: string;
    minimumTransferAmount: string;
  };
  xcmFee: {
    symbol: string;
    decimals: number;
    locationId: string;
    amount: string;
  };
  remoteAssetId: {
    parents: number;
    interior: {
      X2: (
        | {
            GlobalConsensus: {
              Ethereum: {
                chainId: string;
              };
            };
          }
        | {
            AccountKey20: {
              network: null;
              key: string;
            };
          }
      )[];
    };
  };
  remoteReserveLocation: {
    parents: number;
    interior: {
      X1: {
        Parachain: number;
      }[];
    };
  };
}>;

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
  Kilt: {
    name: "Kilt",
    snowEnv: "polkadot_mainnet",
    endpoint: "wss://spiritnet.kilt.io/",
    pallet: "assetSwitchPool1",
    switchPair: [
      {
        id: "assetSwitchPool1",
        tokenMetadata: {
          symbol: "wKILT",
          decimals: 15,
          address: "",
          minimumTransferAmount: BigInt(33333333),
        },
        xcmFee: {
          symbol: "DOT",
          decimals: 10,
          locationId: "assethub",
          amount: BigInt(10000000000),
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
                  key: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
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
          id: "wKILT",
          address: "",
          minimumTransferAmount: 1n,
        },
      ],
    },
    nativeTokenMetadata: {
      symbol: "KILT",
      decimals: 15,
    },
  },
  // Kilt on paseo_sepolia
  Rilt: {
    name: "Rilt",
    snowEnv: "rococo_sepolia",
    endpoint: "wss://rilt.kilt.io",
    pallet: "assetSwitchPool1",
    switchPair: [
      {
        id: "assetSwitchPool1",
        tokenMetadata: {
          symbol: "wRILT",
          decimals: 15,
          address: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
          minimumTransferAmount: "10000000000000",
        },
        xcmFee: {
          symbol: "ROC",
          decimals: 10,
          locationId: "assethub",
          amount: "10000000000",
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
                  key: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
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
  // Kilt on paseo_sepolia
  Pilt: {
    name: "Pilt",
    snowEnv: "paseo_sepolia",
    endpoint: "wss://peregrine.kilt.io/parachain-public-ws/",
    pallet: "assetSwitchPool1",
    switchPair: [
      {
        id: "assetSwitchPool1",
        tokenMetadata: {
          symbol: "wPILT",
          decimals: 15,
          address: "0x22E12ed4e6BCdE652A73552dDe340FCb972EEf89",
          minimumTransferAmount: BigInt(10000000000000),
        },
        xcmFee: {
          symbol: "ROC",
          decimals: 10,
          locationId: "assethub",
          amount: BigInt(10000000000),
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
                  key: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
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
      id: "rilt",
      name: "Pilt",
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
          id: "wPILT",
          address: "0x22E12ed4e6BCdE652A73552dDe340FCb972EEf89",
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
