import { type useRouter } from "next/navigation";
import { toPolkadot, toEthereum, environment, assets } from "@snowbridge/api";
import { Struct, u128 } from "@polkadot/types";
import { AccountId32 } from "@polkadot/types/interfaces";
import { Codec } from "@polkadot/types/types";
import { TransferFormData } from "./formSchema";
import { WalletAccount } from "@talismn/connect-wallets";
import {
  BrowserProvider,
  ContractTransactionReceipt,
  ContractTransactionResponse,
} from "ethers";

export type AppRouter = ReturnType<typeof useRouter>;
export type ValidationError =
  | ({ kind: "toPolkadot" } & toPolkadot.SendValidationError)
  | ({ kind: "toEthereum" } & toEthereum.SendValidationError);

export type ErrorInfo = {
  title: string;
  description: string;
  errors: ValidationError[];
};

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

export interface ValidationData {
  formData: TransferFormData;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
  tokenMetadata: assets.ERC20Metadata;
  amountInSmallestUnit: bigint;
}

export type SendValidationResult =
  | toPolkadot.SendValidationResult
  | toEthereum.SendValidationResult;

export type SendResult = toPolkadot.SendResult | toEthereum.SendResult;

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
  errors: (toEthereum.SendValidationError | toPolkadot.SendValidationError)[];
  plan: SendValidationResult;
}

export interface ContractResponse {
  response: ContractTransactionResponse;
  receipt: ContractTransactionReceipt | null;
}
