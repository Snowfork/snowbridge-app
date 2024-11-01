import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountAtom } from "@/store/polkadot";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { SignerInfo, TransferFormData, ValidationData } from "@/utils/types";
import { Signer } from "@polkadot/api/types";
import { Context, environment, toEthereum, toPolkadot } from "@snowbridge/api";
import { track } from "@vercel/analytics";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

async function planSend(
  context: Context,
  source: environment.TransferLocation,
  destination: environment.TransferLocation,
  amountInSmallestUnit: bigint,
  formData: TransferFormData,
  { polkadotAccount, ethereumAccount, ethereumProvider }: SignerInfo,
): Promise<toPolkadot.SendValidationResult | toEthereum.SendValidationResult> {
  track("Validate Send", formData);

  switch (source.type) {
    case "substrate": {
      if (destination.type !== "ethereum") {
        throw Error(`Invalid form state: destination type mismatch.`);
      }
      if (source.paraInfo === undefined) {
        throw Error(`Invalid form state: source does not have parachain info.`);
      }
      if (!polkadotAccount) {
        throw Error(`Polkadot Wallet not connected.`);
      }
      if (polkadotAccount.address !== formData.sourceAccount) {
        throw Error(`Source account mismatch.`);
      }
      const walletSigner = {
        address: polkadotAccount.address,
        signer: polkadotAccount.signer! as Signer,
      };
      const plan = await toEthereum.validateSend(
        context,
        walletSigner,
        source.paraInfo.paraId,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
      );
      console.log(plan);
      if (plan.failure) {
        track("Plan Failed", {
          ...formData,
          errors: JSON.stringify(plan.failure.errors),
        });
      }
      return plan;
    }
    case "ethereum": {
      if (destination.type !== "substrate") {
        throw Error(`Invalid form state: destination type mismatch.`);
      }
      if (destination.paraInfo === undefined) {
        throw Error(
          `Invalid form state: destination does not have parachain id.`,
        );
      }
      if (!ethereumProvider) throw Error(`Ethereum Wallet not connected.`);
      if (!ethereumAccount) throw Error(`Wallet account not selected.`);
      if (ethereumAccount !== formData.sourceAccount) {
        throw Error(`Selected account does not match source data.`);
      }
      const signer = await ethereumProvider.getSigner(ethereumAccount);
      if (signer.address.toLowerCase() !== formData.sourceAccount.toLowerCase())
        throw Error(`Source account mismatch.`);
      const plan = await toPolkadot.validateSend(
        context,
        signer,
        formData.beneficiary,
        formData.token,
        destination.paraInfo.paraId,
        amountInSmallestUnit,
        destination.paraInfo.destinationFeeDOT,
        {
          maxConsumers: destination.paraInfo.maxConsumers,
          ignoreExistentialDeposit:
            destination.paraInfo.skipExistentialDepositCheck,
        },
      );
      console.log(plan);
      if (plan.failure) {
        track("Plan Failed", {
          ...formData,
          errors: JSON.stringify(plan.failure.errors),
        });
      }
      return plan;
    }
    default:
      throw Error(`Invalid form state: cannot infer source type.`);
  }
}

export function useSendToken() {
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const plan = useCallback(
    async (data: ValidationData) => {
      if (context === null) return;
      return await planSend(
        context,
        data.source,
        data.destination,
        data.amountInSmallestUnit,
        data.formData,
        {
          polkadotAccount: polkadotAccount ?? undefined,
          ethereumAccount: ethereumAccount ?? undefined,
          ethereumProvider: ethereumProvider ?? undefined,
        },
      );
    },
    [context, polkadotAccount, ethereumAccount, ethereumProvider],
  );
  const send = useCallback(async () => {
    console.log("SEND!!!!!");
  }, []);
  return [plan, send];
}
