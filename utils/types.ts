import { type useRouter } from "next/navigation";
import {
  assetsV2,
  toEthereumV2,
  toEthereumFromEVMV2,
  toPolkadotV2,
  forKusama,
  forInterParachain,
} from "@snowbridge/api";
import { Struct, u128 } from "@polkadot/types";
import { AccountId32 } from "@polkadot/types/interfaces";
import { Codec } from "@polkadot/types/types";
import { TransferFormData } from "./formSchema";
import { WalletAccount } from "@talismn/connect-wallets";
import {
  BrowserProvider,
  TransactionReceipt,
  TransactionResponse,
} from "ethers";
import { AssetRegistry, ERC20Metadata } from "@snowbridge/base-types";

export const DOT_DECIMALS = 10;
export const KSM_DECIMALS = 12;

export const DOT_SYMBOL = "DOT";
export const KSM_SYMBOL = "KSM";

export type AppRouter = ReturnType<typeof useRouter>;
export type ValidationError =
  | ({ errorKind: "toPolkadotV2" } & toPolkadotV2.ValidationLog)
  | ({ errorKind: "toEthereumV2" } & toEthereumV2.ValidationLog)
  | ({ errorKind: "forKusama" } & forKusama.ValidationLog);

export type ErrorInfo = {
  title: string;
  description: string;
  errors: ValidationError[];
};

export enum AssetHub {
  Polkadot = "polkadotAssetHub",
  Kusama = "kusamaAssetHub",
}

export type FormDataSwitch = {
  source: string;
  sourceAccount: string;
  destination: string;
  token: string;
  amount: string;
  beneficiary: string;
};

export type AccountInfo = {
  key: string;
  name: string;
  type: "substrate" | "ethereum";
};

export type TokenMetadata = {
  symbol: string;
  decimals: number;
  minimumTransferAmount: string;
};

export type XcmFee = {
  symbol: string;
  decimals: number;
  locationId: string;
  amount: string;
  remoteXcmFee: {
    V4: {
      id: {
        parents: number;
        interior: any;
      };
      fun: {
        Fungible: number;
      };
    };
  };
};

export type RemoteAssetId = {
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

export type RemoteReserveLocation = {
  parents: number;
  interior: {
    X1: {
      Parachain: number;
    }[];
  };
};

export type SwitchPairEntry = {
  id: string;
  tokenMetadata: TokenMetadata;
  xcmFee: XcmFee;
  remoteAssetId: RemoteAssetId;
  remoteReserveLocation: RemoteReserveLocation;
};

export type SwitchPair = SwitchPairEntry[];

export interface PalletAssetSwitchSwitchSwitchPairInfo extends Struct {
  readonly poolAccount: AccountId32;
  readonly remoteAssetCirculatingSupply: u128;
  readonly remoteAssetEd: u128;
  readonly remoteAssetId: Codec;
  readonly remoteAssetTotalSupply: u128;
  readonly remoteReserveLocation: Codec;
  readonly remoteXcmFee: Codec;
  readonly status: Codec;
  readonly remoteAssetSovereignTotalBalance: u128;
}

export interface SignerInfo {
  polkadotAccount?: WalletAccount;
  ethereumAccount?: string;
  ethereumProvider?: BrowserProvider;
}

export type FeeInfo = {
  fee: bigint;
  decimals: number;
  symbol: string;
  delivery:
    | toEthereumV2.DeliveryFee
    | toPolkadotV2.DeliveryFee
    | forInterParachain.DeliveryFee;
  type: assetsV2.SourceType;
};

export type KusamaFeeInfo = {
  fee: bigint;
  decimals: number;
  symbol: string;
  delivery: forKusama.DeliveryFee;
};

export interface ValidationData {
  formData: TransferFormData;
  assetRegistry: AssetRegistry;
  source: assetsV2.TransferLocation;
  destination: assetsV2.TransferLocation;
  tokenMetadata: ERC20Metadata;
  amountInSmallestUnit: bigint;
  fee: FeeInfo;
}

export interface KusamaValidationData {
  assetRegistry: AssetRegistry;
  source: string;
  destination: string;
  sourceAccount: string;
  beneficiary: string;
  token: string;
  tokenMetadata: ERC20Metadata;
  amountInSmallestUnit: bigint;
  fee: KusamaFeeInfo;
}

export type ValidationResult =
  | toEthereumV2.ValidationResult
  | toEthereumFromEVMV2.ValidationResultEvm
  | toPolkadotV2.ValidationResult
  | forKusama.ValidationResult
  | forInterParachain.ValidationResult;

export type MessageReciept =
  | toEthereumV2.MessageReceipt
  | toEthereumFromEVMV2.MessageReceiptEvm
  | toPolkadotV2.MessageReceipt
  | forKusama.MessageReceipt
  | forInterParachain.MessageReceipt;

export enum TransferStepKind {
  DepositWETH,
  ApproveERC20,
  SubstrateTransferFee,
  SubstrateTransferED,
}
export interface TransferStep {
  displayOrder: number;
  kind: TransferStepKind;
}

export interface TransferPlanSteps {
  steps: TransferStep[];
  errors: (
    | toEthereumV2.ValidationLog
    | toPolkadotV2.ValidationLog
    | forInterParachain.ValidationLog
  )[];
  plan: ValidationResult;
}

export interface ContractResponse {
  response: TransactionResponse;
  receipt: TransactionReceipt | null;
}
