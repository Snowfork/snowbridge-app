import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { AssetHub, KusamaValidationData, MessageReciept, SignerInfo } from "@/utils/types";
import { Signer } from "@polkadot/api/types";
import { Context, forKusama } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { Direction } from "../../snowbridge/web/packages/api/src/forKusama";

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
): Promise<forKusama.ValidationResult> {
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
      bridgeHubDeliveryFee: 0n,
      xcmBridgeFee: 0n,
      totalFeeInDot: fee.fee,
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
    return plan;
  } else if (source == AssetHub.Kusama && destination === AssetHub.Polkadot) {
    validateSubstrateDestination(data);
    const sourceAssetHub = await context.kusamaAssetHub();
    const destAssetHub = await context.assetHub();
    if (!sourceAssetHub) {
      throw Error(`Kusama AssetHub could not connect`);
    }
    // Create a new delivery fee object
    const deliveryFee: forKusama.DeliveryFee = {
      bridgeHubDeliveryFee: 0n,
      xcmBridgeFee: 0n,
      totalFeeInDot: fee.fee,
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
    return plan;
  } else {
    throw Error(`Invalid form state: cannot infer source type.`);
  }
}

async function sendToken(
  context: Context,
  data: KusamaValidationData,
  plan: forKusama.ValidationResult,
  signerInfo: SignerInfo,
): Promise<forKusama.MessageReceipt> {
  if (!plan.success) {
    throw Error(`Cannot execute a failed plan.`, {
      cause: plan,
    });
  }
  const { source, destination } = data;
  const { paraInfo, polkadotAccount } = validateSubstrateSigner(
    data,
    signerInfo,
  );
  let sourceAssetHub: any;
  if (source == AssetHub.Polkadot) {
    sourceAssetHub = await context.assetHub();
  } else {
    sourceAssetHub = await context.kusamaAssetHub();
  }
  const tx = plan.transfer as forKusama.Transfer;
  const result = await forKusama.signAndSend(
    sourceAssetHub,
    tx,
    polkadotAccount.address,
    {
      signer: polkadotAccount.signer! as Signer,
      withSignedTransaction: true,
    },
  );
  return result;
}

export function useSendKusamaToken(): [
  (data: KusamaValidationData) => Promise<forKusama.ValidationResult>,
  (data: KusamaValidationData, plan: forKusama.ValidationResult) => Promise<forKusama.MessageReceipt>,
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
    async (data: KusamaValidationData, plan: forKusama.ValidationResult) => {
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
