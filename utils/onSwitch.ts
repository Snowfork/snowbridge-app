"use client";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { Context, environment } from "@snowbridge/api";
import { Dispatch, SetStateAction } from "react";
import {
  ErrorInfo,
  PalletAssetSwitchSwitchSwitchPairInfo,
} from "@/utils/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { decodeAddress } from "@polkadot/util-crypto";
import { parachainConfigs } from "./parachainConfigs";
import { Option } from "@polkadot/types";

export async function submitParachainToAssetHubTransfer({
  context,
  beneficiary,
  sourceAccount,
  parachainId,
  amount,
  palletName,
  setError,
  setBusyMessage,
  createTransaction,
}: {
  context: Context | null;
  beneficiary: string;
  sourceAccount: string;
  parachainId: number;
  amount: bigint;
  palletName: string;
  setError: Dispatch<SetStateAction<ErrorInfo | null>>;
  setBusyMessage: Dispatch<SetStateAction<string>>;
  createTransaction: (
    transaction: SubmittableExtrinsic<"promise", ISubmittableResult>,
    remoteXcmFees: string,
  ) => void;
}): Promise<void> {
  try {
    if (!context) {
      throw Error("Invalid context: please update context");
    }

    const parachainApi = context.polkadot.api.parachains[parachainId];

    const pathToBeneficiary = {
      V3: {
        parents: 0,
        interior: {
          X1: {
            AccountId32: {
              id: decodeAddress(beneficiary),
            },
          },
        },
      },
    };

    const transfer = parachainApi.tx[palletName].switch(
      amount,
      pathToBeneficiary,
    );
    const transactionFee = await transfer.paymentInfo(sourceAccount);

    createTransaction(transfer, transactionFee.partialFee.toHuman());
  } catch (err) {
    console.error(err);
    setBusyMessage("");
    setError({
      title: "Send Error",
      description: `Error occured while trying to send transaction.`,
      errors: [],
    });
  }
}

export async function submitAssetHubToParachainTransfer({
  context,
  beneficiary,
  paraId,
  palletName,
  amount,
  sourceAccount,
  setError,
  setBusyMessage,
  createTransaction,
}: {
  context: Context | null;
  beneficiary: string;
  paraId: number;
  palletName: string;
  amount: bigint;
  sourceAccount: string;
  setError: Dispatch<SetStateAction<ErrorInfo | null>>;
  setBusyMessage: Dispatch<SetStateAction<string>>;
  createTransaction: (
    transaction: SubmittableExtrinsic<"promise", ISubmittableResult>,
    remoteXcmFee: string,
  ) => void;
}): Promise<void> {
  try {
    if (!context) {
      throw Error("Invalid context: please update context");
    }

    const assetHubApi = context.polkadot.api.assetHub;
    const parachainApi = context.polkadot.api.parachains[paraId];

    const switchPair =
      await parachainApi.query[palletName].switchPair<
        Option<PalletAssetSwitchSwitchSwitchPairInfo>
      >();

    const pathToBeneficiary = {
      parents: 0,
      interior: {
        X1: [
          {
            AccountId32: {
              id: decodeAddress(beneficiary),
            },
          },
        ],
      },
    };
    const pathToParachain = {
      parents: 1,
      interior: {
        X1: [
          {
            Parachain: paraId,
          },
        ],
      },
    };

    //@ts-ignore Due to the custom KILT typing
    const remoteAssetId = switchPair.unwrap().remoteAssetId.asV4;

    const transfer = assetHubApi.tx.polkadotXcm.transferAssetsUsingTypeAndThen(
      {
        V4: pathToParachain,
      },
      {
        V4: [
          {
            id: remoteAssetId,
            fun: { Fungible: amount },
          },
        ],
      },
      "LocalReserve",
      { V4: remoteAssetId },
      "LocalReserve",
      {
        V4: [
          {
            DepositAsset: {
              assets: { Wild: "All" },
              beneficiary: pathToBeneficiary,
            },
          },
        ],
      },
      "Unlimited",
    );

    const transactionFee = await transfer.paymentInfo(sourceAccount);

    createTransaction(transfer, transactionFee.partialFee.toHuman());
  } catch (err) {
    console.error(err);
    setBusyMessage("");
    setError({
      title: "Send Error",
      description: `Error occured while trying to send transaction ${err}`,
      errors: [],
    });
  }
}
