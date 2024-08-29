"use client";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { Context, assets, environment } from "@snowbridge/api";

import { Dispatch, SetStateAction } from "react";

import { parseAmount } from "@/utils/balances";
import { ErrorInfo } from "@/utils/types";

import { ISubmittableResult } from "@polkadot/types/types";
import { decodeAddress } from "@polkadot/util-crypto";
import { parachainConfigs } from "./parachainConfigs";

export function submitParachainToAssetHubTransfer({
  context,
  beneficiary,
  source,
  amount,
  tokenMetadata,
  setError,
  setBusyMessage,
  sendTransaction,
}: {
  context: Context | null;
  beneficiary: string;
  source: environment.TransferLocation;
  amount: string;
  tokenMetadata: assets.ERC20Metadata;
  setError: Dispatch<SetStateAction<ErrorInfo | null>>;
  setBusyMessage: Dispatch<SetStateAction<string>>;
  sendTransaction: (
    transaction: SubmittableExtrinsic<"promise", ISubmittableResult>,
  ) => void;
}): void {
  try {
    const { pallet } = parachainConfigs[source.name];

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
    const amountInSmallestUnit = parseAmount(amount, tokenMetadata);
    const transfer = parachainApi.tx[pallet].switch(
      amountInSmallestUnit,
      pathToBeneficiary,
    );
    sendTransaction(transfer);
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
  tokenMetadata,
  setError,
  setBusyMessage,
  sendTransaction,
}: {
  context: Context | null;
  beneficiary: string;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
  amount: string;
  tokenMetadata: assets.ERC20Metadata;
  setError: Dispatch<SetStateAction<ErrorInfo | null>>;
  setBusyMessage: Dispatch<SetStateAction<string>>;
  sendTransaction: (
    transaction: SubmittableExtrinsic<"promise", ISubmittableResult>,
  ) => void;
}): Promise<void> {
  try {
    const { pallet, parachainId } = parachainConfigs[destination.name];
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

    const assetHubApi = context.polkadot.api.assetHub;
    const parachainApi =
      context.polkadot.api.parachains[destination.paraInfo?.paraId];

    const switchPair = await parachainApi.query[pallet].switchPair();
    const remoteAssetId = (switchPair as any)
      .unwrap()
      .remoteAssetId.toJSON().v4;

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
            Parachain: parachainId,
          },
        ],
      },
    };
    const amountInSmallestUnit = parseAmount(amount, tokenMetadata);
    const transfer = assetHubApi.tx.polkadotXcm.transferAssetsUsingTypeAndThen(
      {
        V4: pathToParachain,
      },
      {
        V4: [{ id: remoteAssetId, fun: { Fungible: amountInSmallestUnit } }],
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
    sendTransaction(transfer);
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
