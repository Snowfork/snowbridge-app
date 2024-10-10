"use client";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { Context } from "@snowbridge/api";
import { PalletAssetSwitchSwitchSwitchPairInfo } from "@/utils/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { decodeAddress } from "@polkadot/util-crypto";
import { Option } from "@polkadot/types";

export async function parachainToAssetHubTransfer({
  context,
  beneficiary,
  parachainId,
  amount,
  palletName,
}: {
  context: Context | null;
  beneficiary: string;
  parachainId: number;
  amount: bigint;
  palletName: string;
}): Promise<SubmittableExtrinsic<"promise", ISubmittableResult>> {
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

  return parachainApi.tx[palletName].switch(amount, pathToBeneficiary);
}

export async function assetHubToParachainTransfer({
  context,
  beneficiary,
  paraId,
  palletName,
  amount,
}: {
  context: Context | null;
  beneficiary: string;
  paraId: number;
  palletName: string;
  amount: bigint;
}): Promise<SubmittableExtrinsic<"promise", ISubmittableResult>> {
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

  return assetHubApi.tx.polkadotXcm.transferAssetsUsingTypeAndThen(
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
}
