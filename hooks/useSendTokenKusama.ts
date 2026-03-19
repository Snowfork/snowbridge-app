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
import { forKusama } from "@snowbridge/api";
import { AppContext, getEnvironmentName } from "@/lib/snowbridge";
import { bridgeInfoFor } from "@snowbridge/registry";
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
  context: AppContext,
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
    const info = bridgeInfoFor(getEnvironmentName());
    const sourceParachain = assetRegistry.parachains[`polkadot_${assetRegistry.assetHubParaId}`];
    const destParachain = assetRegistry.kusama?.parachains[`kusama_${assetRegistry.kusama?.assetHubParaId}`];
    if (!destParachain) {
      throw Error(`Kusama AssetHub could not connect`);
    }
    const route = {
      from: { kind: "polkadot" as const, id: assetRegistry.assetHubParaId },
      to: { kind: "kusama" as const, id: assetRegistry.kusama!.assetHubParaId },
      assets: [],
    };
    const kusamaTransfer = new forKusama.KusamaTransfer(info, context, route, sourceParachain, destParachain);
    // Create a new delivery fee object
    const deliveryFee: forKusama.DeliveryFee = {
      kind: "polkadot->kusama",
      bridgeHubDeliveryFee: fee.delivery.bridgeHubDeliveryFee,
      xcmBridgeFee: fee.delivery.xcmBridgeFee,
      destinationFee: fee.delivery.destinationFee,
      totalFeeInNative: fee.fee,
    };

    const tx = await kusamaTransfer.tx(
      sourceAccount,
      beneficiary,
      token,
      amountInSmallestUnit,
      deliveryFee,
    );
    const plan = await kusamaTransfer.validate(tx);
    console.log(plan);
    return { ...plan, kind: "polkadot->kusama" };
  } else if (source == AssetHub.Kusama && destination === AssetHub.Polkadot) {
    validateSubstrateDestination(data);
    const info = bridgeInfoFor(getEnvironmentName());
    const sourceParachain = assetRegistry.kusama?.parachains[`kusama_${assetRegistry.kusama?.assetHubParaId}`];
    const destParachain = assetRegistry.parachains[`polkadot_${assetRegistry.assetHubParaId}`];
    if (!sourceParachain) {
      throw Error(`Kusama AssetHub could not connect`);
    }
    const route = {
      from: { kind: "kusama" as const, id: assetRegistry.kusama!.assetHubParaId },
      to: { kind: "polkadot" as const, id: assetRegistry.assetHubParaId },
      assets: [],
    };
    const kusamaTransfer = new forKusama.KusamaTransfer(info, context, route, sourceParachain, destParachain);
    // Create a new delivery fee object
    const deliveryFee: forKusama.DeliveryFee = {
      kind: "kusama->polkadot",
      bridgeHubDeliveryFee: fee.delivery.bridgeHubDeliveryFee,
      xcmBridgeFee: fee.delivery.xcmBridgeFee,
      destinationFee: fee.delivery.destinationFee,
      totalFeeInNative: fee.fee,
    };

    const tx = await kusamaTransfer.tx(
      sourceAccount,
      beneficiary,
      token,
      amountInSmallestUnit,
      deliveryFee,
    );
    const plan = await kusamaTransfer.validate(tx);
    console.log(plan);
    return { ...plan, kind: "kusama->polkadot" };
  } else {
    throw Error(`Invalid form state: cannot infer source type.`);
  }
}

async function sendToken(
  context: AppContext,
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
  const { source, assetRegistry } = data;
  const { polkadotAccount } = validateSubstrateSigner(data, signerInfo);
  const info = bridgeInfoFor(getEnvironmentName());
  let sourceParachain, destParachain, route;
  if (source == AssetHub.Polkadot) {
    sourceParachain = assetRegistry.parachains[`polkadot_${assetRegistry.assetHubParaId}`];
    destParachain = assetRegistry.kusama?.parachains[`kusama_${assetRegistry.kusama?.assetHubParaId}`];
    route = {
      from: { kind: "polkadot" as const, id: assetRegistry.assetHubParaId },
      to: { kind: "kusama" as const, id: assetRegistry.kusama!.assetHubParaId },
      assets: [],
    };
  } else {
    sourceParachain = assetRegistry.kusama?.parachains[`kusama_${assetRegistry.kusama?.assetHubParaId}`];
    destParachain = assetRegistry.parachains[`polkadot_${assetRegistry.assetHubParaId}`];
    route = {
      from: { kind: "kusama" as const, id: assetRegistry.kusama!.assetHubParaId },
      to: { kind: "polkadot" as const, id: assetRegistry.assetHubParaId },
      assets: [],
    };
  }
  if (!sourceParachain || !destParachain) {
    throw Error(`Cannot resolve parachains.`);
  }
  const kusamaTransfer = new forKusama.KusamaTransfer(info, context, route, sourceParachain, destParachain);
  const transfer = plan as forKusama.ValidatedTransfer;
  const result = await kusamaTransfer.signAndSend(
    transfer,
    polkadotAccount.address,
    {
      signer: polkadotAccount.signer! as any,
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
