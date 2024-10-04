"use client";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { Context, environment } from "@snowbridge/api";
import { Dispatch, SetStateAction } from "react";
import { ErrorInfo } from "@/utils/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { decodeAddress } from "@polkadot/util-crypto";
import { parachainConfigs } from "./parachainConfigs";

export async function submitParachainToAssetHubTransfer({
  context,
  beneficiary,
  sourceAccount,
  source,
  amount,
  pallet,
  setError,
  setBusyMessage,
  createTransaction,
}: {
  context: Context | null;
  beneficiary: string;
  sourceAccount: string;
  source: environment.TransferLocation;
  amount: bigint;
  pallet: string;
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
    if (source.type !== "substrate") {
      throw Error(`Invalid form state: source type mismatch.`);
    }
    if (!source.paraInfo) {
      throw Error(`Invalid form state: source does not have parachain id.`);
    }

    const parachainApi =
      context.polkadot.api.parachains[source.paraInfo?.paraId];

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

    const transfer = parachainApi.tx[pallet].switch(amount, pathToBeneficiary);
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
  source,
  destination,
  amount,
  sourceAccount,
  setError,
  setBusyMessage,
  createTransaction,
}: {
  context: Context | null;
  beneficiary: string;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
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
    if (source.type !== "substrate") {
      throw Error(`Invalid form state: source type mismatch.`);
    }
    if (!source.paraInfo) {
      throw Error(`Invalid form state: source does not have parachain id.`);
    }
    if (destination.type !== "substrate") {
      throw Error(`Invalid form state: destination type mismatch.`);
    }
    if (destination.paraInfo === undefined) {
      throw Error(
        `Invalid form state: destination does not have parachain id.`,
      );
    }
    const { pallet } = parachainConfigs[destination.name];
    const assetHubApi = context.polkadot.api.assetHub;
    const parachainApi =
      context.polkadot.api.parachains[destination.paraInfo?.paraId];

    const switchPair = await parachainApi.query[pallet].switchPair();

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
            Parachain: destination.paraInfo?.paraId,
          },
        ],
      },
    };
    const remoteAssetId = switchPair.unwrap().remoteAssetId.v4;

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
