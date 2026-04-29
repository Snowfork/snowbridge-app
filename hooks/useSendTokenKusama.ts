import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeApiAtom } from "@/store/snowbridge";
import {
  AssetHub,
  KusamaValidationData,
  MessageReceipt,
  SignerInfo,
  ValidationResult,
} from "@/utils/types";
import { type SnowbridgeClient } from "@/lib/snowbridge";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

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
  validateSubstrateDestination(data);
  return { polkadotAccount };
}

function kusamaSender(api: SnowbridgeClient, data: KusamaValidationData) {
  const registry = data.assetRegistry;
  if (!registry.kusama) {
    throw Error(`Kusama config is not available.`);
  }
  const from =
    data.source === AssetHub.Polkadot
      ? { kind: "polkadot" as const, id: registry.assetHubParaId }
      : { kind: "kusama" as const, id: registry.kusama.assetHubParaId };
  const to =
    data.destination === AssetHub.Polkadot
      ? { kind: "polkadot" as const, id: registry.assetHubParaId }
      : { kind: "kusama" as const, id: registry.kusama.assetHubParaId };
  const sender = api.sender(from, to);
  if (sender.kind !== "polkadot->kusama" && sender.kind !== "kusama->polkadot") {
    throw Error(`Invalid Kusama route ${sender.kind}.`);
  }
  return sender;
}

async function planSend(
  api: SnowbridgeClient,
  data: KusamaValidationData,
): Promise<ValidationResult> {
  const sender = kusamaSender(api, data);
  const transfer = await sender.tx(
    data.sourceAccount,
    data.beneficiary,
    data.token,
    data.amountInSmallestUnit,
    data.fee,
  );
  return await sender.validate(transfer);
}

async function sendToken(
  api: SnowbridgeClient,
  data: KusamaValidationData,
  plan: ValidationResult,
  signerInfo: SignerInfo,
): Promise<MessageReceipt> {
  if (!plan.success) {
    throw Error(`Cannot execute a failed plan.`, {
      cause: plan,
    });
  }
  const sender = kusamaSender(api, data);
  if (plan.kind !== sender.kind) {
    throw Error(`Invalid validated transfer kind ${plan.kind}.`);
  }
  const { polkadotAccount } = validateSubstrateSigner(data, signerInfo);
  const result = await sender.signAndSend(plan, polkadotAccount.address, {
    signer: polkadotAccount.signer as any,
    withSignedTransaction: false,
  });
  return { kind: sender.kind, ...result };
}

export function useSendKusamaToken(): [
  (data: KusamaValidationData) => Promise<ValidationResult>,
  (
    data: KusamaValidationData,
    plan: ValidationResult,
  ) => Promise<MessageReceipt>,
] {
  const api = useAtomValue(snowbridgeApiAtom);
  const plan = useCallback(
    async (data: KusamaValidationData) => {
      if (api === null) throw Error("No api");
      return await planSend(api, data);
    },
    [api],
  );

  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const send = useCallback(
    async (data: KusamaValidationData, plan: ValidationResult) => {
      if (api === null) throw Error("No api");
      return await sendToken(api, data, plan, {
        polkadotAccount: (polkadotAccounts ?? []).find(
          (pa) => pa.address === data.sourceAccount,
        ),
        ethereumAccount: ethereumAccount ?? undefined,
        ethereumProvider: ethereumProvider ?? undefined,
      });
    },
    [api, polkadotAccounts, ethereumAccount, ethereumProvider],
  );
  return [plan, send];
}
