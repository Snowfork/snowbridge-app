import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { KusamaValidationData, MessageReciept, SignerInfo } from "@/utils/types";
import { Signer } from "@polkadot/api/types";
import { Context, toEthereumV2, toKusama, toPolkadotV2 } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { Direction } from "../../snowbridge/web/packages/api/src/toKusama";
import { ApiPromise } from "@polkadot/api";

function validateSubstrateDestination({
  source,
  destination,
}: KusamaValidationData) {
  if (source !== "polkadotAssethub" && destination !== "kusamaAssethub") || (source !== "kusamaAssethub" && destination !== "polkadotAssethub") {
    throw Error(`Invalid form state: source and destination combination mismatch.`);
  }
}

function validateSubstrateSigner(
  data: KusamaValidationData,
  { polkadotAccount }: SignerInfo,
) {
  if (!polkadotAccount) {
    throw Error(`Polkadot Wallet not connected.`);
  }
  if (polkadotAccount.address !== data.formData.sourceAccount) {
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
): Promise<toKusama.ValidationResult> {
  const {
    source,
    destination,
    amountInSmallestUnit,
    formData,
    assetRegistry,
    fee,
  } = data;
  if (source === "polkadotAssetHub" && destination == "kusamaAssetHub") {
    validateSubstrateDestination(data);
    const sourceAssetHub = await context.assetHub();
    const destAssetHub = await context.kusamaAssetHub();
    if (!destAssetHub) {
      throw Error(`Kusama AssetHub could not connect`);
    }
    const tx = await toKusama.createTransfer(
      sourceAssetHub,
      Direction.ToKusama,
      assetRegistry,
      formData.sourceAccount,
      formData.beneficiary,
      formData.token,
      amountInSmallestUnit,
      fee as toKusama.DeliveryFee,
    );
    const plan = await toKusama.validateTransfer(
      {
        sourceAssetHub: sourceAssetHub,
        destAssetHub: destAssetHub,
      },
      Direction.ToKusama,
      tx,
    );
    console.log(plan);
    return plan;
  } else if (source == "kusamaAssetHub" && destination === "polkadotAssetHub") {
    validateSubstrateDestination(data);
    const sourceAssetHub = await context.kusamaAssetHub();
    const destAssetHub = await context.assetHub();
    if (!sourceAssetHub) {
      throw Error(`Kusama AssetHub could not connect`);
    }
    const tx = await toKusama.createTransfer(
      sourceAssetHub,
      Direction.ToPolkadot,
      assetRegistry,
      formData.sourceAccount,
      formData.beneficiary,
      formData.token,
      amountInSmallestUnit,
      fee as toKusama.DeliveryFee,
    );
    const plan = await toKusama.validateTransfer(
      {
        sourceAssetHub: sourceAssetHub,
        destAssetHub: destAssetHub,
      },
      Direction.ToKusama,
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
  plan: toKusama.ValidationResult,
  signerInfo: SignerInfo,
): Promise<toKusama.MessageReceipt> {
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
  if (source == "polkadotAssethub") {
    sourceAssetHub = context.assetHub()
  } else {
    sourceAssetHub = context.kusamaAssetHub()
  }
  const tx = plan.transfer as toKusama.Transfer;
  const result = await toKusama.signAndSend(
    sourceAssetHub,
    tx,
    polkadotAccount.address,
    {
      signer: polkadotAccount.signer! as Signer,
      withSignedTransaction: true,
    },
  );
  console.log(result);
  return result;
}

export function useSendToken(): [
  (data: KusamaValidationData) => Promise<toKusama.ValidationResult>,
  (data: KusamaValidationData, plan: toKusama.ValidationResult) => Promise<MessageReciept>,
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
    async (data: KusamaValidationData, plan: toKusama.ValidationResult) => {
      if (context === null) throw Error("No context");
      return await sendToken(context, data, plan, {
        polkadotAccount: (polkadotAccounts ?? []).find(
          (pa) => pa.address === data.formData.sourceAccount,
        ),
        ethereumAccount: ethereumAccount ?? undefined,
        ethereumProvider: ethereumProvider ?? undefined,
      });
    },
    [context, polkadotAccounts, ethereumAccount, ethereumProvider],
  );
  return [plan, send];
}
