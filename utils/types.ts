import { type useRouter } from "next/navigation";
import {
  toEthereumV2,
  toEthereumFromEVMV2,
  toPolkadotV2,
  forKusama,
  forInterParachain,
  toPolkadotSnowbridgeV2,
} from "@snowbridge/api";
import { Struct, u128 } from "@polkadot/types";
import { AccountId32 } from "@polkadot/types/interfaces";
import { Codec } from "@polkadot/types/types";
import { TransferFormData } from "./formSchema";
import { PolkadotAccount } from "@/store/polkadot";
import {
  BrowserProvider,
  TransactionReceipt,
  TransactionResponse,
} from "ethers";
import {
  AssetRegistry,
  ChainKind,
  ERC20Metadata,
  TransferLocation,
} from "@snowbridge/base-types";

export const DOT_DECIMALS = 10;
export const KSM_DECIMALS = 12;

export const DOT_SYMBOL = "DOT";
export const KSM_SYMBOL = "KSM";
export const NEURO_WEB_PARACHAIN = 2043;

export type TransferType =
  | "ethereum->ethereum"
  | "ethereum->polkadot"
  | "polkadot->ethereum"
  | "polkadot->polkadot"
  | "ethereum_l2->polkadot"
  | "polkadot->ethereum_l2"
  | "kusama->polkadot"
  | "polkadot->kusama";

export type AppRouter = ReturnType<typeof useRouter>;
export type ValidationError =
  | ({ errorKind: "ethereum->polkadot" } & toPolkadotV2.ValidationLog)
  | ({ errorKind: "polkadot->ethereum" } & toEthereumV2.ValidationLog)
  | ({ errorKind: "ethereum->ethereum" } & toEthereumV2.ValidationLog)
  | ({ errorKind: "polkadot->kusama" } & forKusama.ValidationLog)
  | ({ errorKind: "kusama->polkadot" } & forKusama.ValidationLog)
  | ({ errorKind: "polkadot->ethereum_l2" } & toEthereumV2.ValidationLog);

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
  polkadotAccount?: PolkadotAccount;
  ethereumAccount?: string;
  ethereumProvider?: BrowserProvider;
}

export type FeeInfo = {
  fee: bigint;
  totalFee: bigint;
  decimals: number;
  symbol: string;
  delivery:
    | ({ kind: "polkadot->ethereum" } & toEthereumV2.DeliveryFee)
    | ({ kind: "ethereum->ethereum" } & toEthereumV2.DeliveryFee)
    | ({ kind: "polkadot->ethereum_l2" } & toEthereumV2.DeliveryFee)
    | ({ kind: "ethereum->polkadot" } & toPolkadotV2.DeliveryFee)
    | ({ kind: "ethereum->polkadot" } & toPolkadotSnowbridgeV2.DeliveryFee)
    | ({ kind: "ethereum_l2->polkadot" } & toPolkadotSnowbridgeV2.DeliveryFee)
    | ({ kind: "polkadot->polkadot" } & forInterParachain.DeliveryFee);
  kind: ChainKind;
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
  source: TransferLocation;
  destination: TransferLocation;
  tokenMetadata: ERC20Metadata;
  amountInSmallestUnit: bigint;
  fee: FeeInfo;
  tokenValueUsd?: number;
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
  | ({ kind: "polkadot->ethereum" } & toEthereumV2.ValidationResult)
  | ({ kind: "polkadot->ethereum_l2" } & toEthereumV2.ValidationResult)
  | ({ kind: "ethereum->ethereum" } & toEthereumFromEVMV2.ValidationResultEvm)
  | ({ kind: "ethereum->polkadot" } & toPolkadotV2.ValidationResult)
  | ({ kind: "ethereum->polkadot" } & toPolkadotSnowbridgeV2.ValidationResult)
  | ({
      kind: "ethereum_l2->polkadot";
    } & toPolkadotSnowbridgeV2.ValidationResult)
  | ({ kind: "polkadot->polkadot" } & forInterParachain.ValidationResult)
  | ({ kind: "kusama->polkadot" } & forKusama.ValidationResult)
  | ({ kind: "polkadot->kusama" } & forKusama.ValidationResult);

export type MessageReceipt =
  | ({ kind: "polkadot->ethereum" } & toEthereumV2.MessageReceipt)
  | ({ kind: "polkadot->ethereum_l2" } & toEthereumV2.MessageReceipt)
  | ({ kind: "ethereum->ethereum" } & toEthereumFromEVMV2.MessageReceiptEvm)
  | ({ kind: "ethereum->polkadot" } & toPolkadotV2.MessageReceipt)
  | ({
      kind: "ethereum_l2->polkadot";
    } & toPolkadotSnowbridgeV2.MessageReceipt & {
        messageId: string;
        channelId: string;
      })
  | ({ kind: "ethereum->polkadot" } & toPolkadotSnowbridgeV2.MessageReceipt & {
        messageId: string;
        channelId: string;
      })
  | ({ kind: "kusama->polkadot" } & forKusama.MessageReceipt)
  | ({ kind: "polkadot->kusama" } & forKusama.MessageReceipt)
  | ({ kind: "polkadot->polkadot" } & forInterParachain.MessageReceipt);

export enum TransferStepKind {
  DepositWETH,
  ApproveERC20,
  SubstrateTransferFee,
  SubstrateTransferED,
  WrapNeuroWeb,
  CreateAgent,
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
