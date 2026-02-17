import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  AssetHub,
  KusamaValidationData,
  MessageReceipt,
  SignerInfo,
  ValidationResult,
} from "@/utils/types";
import { Signer } from "@polkadot/api/types";
import { Context, forKusama } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { Direction } from "@snowbridge/api/dist/forKusama";

function validateSubstrateDestination({
  source,
  destination,
}: KusamaValidationData) {
  if (
    !(source === AssetHub.Polkadot && destination === AssetHub.Kusama) &&
    !(source === AssetHub.Kusama && destination === AssetHub.Polkadot)
  ) {
    throw Error(
      `Invalid form state: source and destination combination mismatch.`,
    );
  }
}

function validateSubstrateSigner(
  data: KusamaValidationData,
  { polkadotAccount }: SignerInfo,
) {
  if (!polkadotAccount) {
    throw Error(`Polkadot Wallet not connected.`);
  }
  if (polkadotAccount.address !== data.sourceAccount) {
    throw Error(`Source account mismatch.`);
  }
  return {
    paraInfo: validateSubstrateDestination(data),
    polkadotAccount,
  };
}

async function planSend(
  context: Context,
  data: KusamaValidationData,
): Promise<ValidationResult> {
  const {
    source,
    destination,
    sourceAccount,
    beneficiary,
    token,
    amountInSmallestUnit,
    assetRegistry,
    fee,
  } = data;
  if (source == AssetHub.Polkadot && destination == AssetHub.Kusama) {
    validateSubstrateDestination(data);
    const sourceAssetHub = await context.assetHub();
    const destAssetHub = await context.kusamaAssetHub();
    if (!destAssetHub) {
      throw Error(`Kusama AssetHub could not connect`);
    }
    // Create a new delivery fee object
    const deliveryFee: forKusama.DeliveryFee = {
      bridgeHubDeliveryFee: fee.delivery.bridgeHubDeliveryFee,
      xcmBridgeFee: fee.delivery.xcmBridgeFee,
      destinationFee: fee.delivery.destinationFee,
      totalFeeInNative: fee.fee,
    };

    const tx = await forKusama.createTransfer(
      sourceAssetHub,
      Direction.ToKusama,
      assetRegistry,
      sourceAccount,
      beneficiary,
      token,
      amountInSmallestUnit,
      deliveryFee,
    );
    const plan = await forKusama.validateTransfer(
      {
        sourceAssetHub: sourceAssetHub,
        destAssetHub: destAssetHub,
      },
      Direction.ToKusama,
      tx,
    );
    console.log(plan);
    return { kind: "polkadot->kusama", ...plan };
  } else if (source == AssetHub.Kusama && destination === AssetHub.Polkadot) {
    validateSubstrateDestination(data);
    const sourceAssetHub = await context.kusamaAssetHub();
    const destAssetHub = await context.assetHub();
    if (!sourceAssetHub) {
      throw Error(`Kusama AssetHub could not connect`);
    }
    // Create a new delivery fee object
    const deliveryFee: forKusama.DeliveryFee = {
      bridgeHubDeliveryFee: fee.delivery.bridgeHubDeliveryFee,
      xcmBridgeFee: fee.delivery.xcmBridgeFee,
      destinationFee: fee.delivery.destinationFee,
      totalFeeInNative: fee.fee,
    };

    const tx = await forKusama.createTransfer(
      sourceAssetHub,
      Direction.ToPolkadot,
      assetRegistry,
      sourceAccount,
      beneficiary,
      token,
      amountInSmallestUnit,
      deliveryFee,
    );
    const plan = await forKusama.validateTransfer(
      {
        sourceAssetHub: sourceAssetHub,
        destAssetHub: destAssetHub,
      },
      Direction.ToPolkadot,
      tx,
    );
    console.log(plan);
    return { kind: "kusama->polkadot", ...plan };
  } else {
    throw Error(`Invalid form state: cannot infer source type.`);
  }
}

async function sendToken(
  context: Context,
  data: KusamaValidationData,
  plan: ValidationResult,
  signerInfo: SignerInfo,
): Promise<MessageReceipt> {
  if (!plan.success) {
    throw Error(`Cannot execute a failed plan.`, {
      cause: plan,
    });
  }
  if (plan.kind !== "kusama->polkadot" && plan.kind !== "polkadot->kusama") {
    throw Error(`Invalid state.`);
  }
  const { source } = data;
  const { polkadotAccount } = validateSubstrateSigner(data, signerInfo);
  let sourceAssetHub: any;
  if (source == AssetHub.Polkadot) {
    sourceAssetHub = await context.assetHub();
  } else {
    sourceAssetHub = await context.kusamaAssetHub();
  }
  const result = await forKusama.signAndSend(
    sourceAssetHub,
    plan.transfer,
    polkadotAccount.address,
    {
      signer: polkadotAccount.signer! as Signer,
      withSignedTransaction: false, // should be true, but there is a bug with Talisman: https://github.com/TalismanSociety/talisman/issues/2180
    },
  );
  return { kind: plan.kind, ...result };
}

export function useSendKusamaToken(): [
  (data: KusamaValidationData) => Promise<ValidationResult>,
  (
    data: KusamaValidationData,
    plan: ValidationResult,
  ) => Promise<MessageReceipt>,
] {
  const context = useAtomValue(snowbridgeContextAtom);
  const plan = useCallback(
    async (data: KusamaValidationData) => {
      if (context === null) throw Error("No context");
      return await planSend(context, data);
    },
    [context],
  );

  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const send = useCallback(
    async (data: KusamaValidationData, plan: ValidationResult) => {
      if (context === null) throw Error("No context");
      return await sendToken(context, data, plan, {
        polkadotAccount: (polkadotAccounts ?? []).find(
          (pa) => pa.address === data.sourceAccount,
        ),
        ethereumAccount: ethereumAccount ?? undefined,
        ethereumProvider: ethereumProvider ?? undefined,
      });
    },
    [context, polkadotAccounts, ethereumAccount, ethereumProvider],
  );
  return [plan, send];
}
