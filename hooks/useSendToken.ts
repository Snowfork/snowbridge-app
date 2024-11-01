import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountAtom } from "@/store/polkadot";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  SendResult,
  SendValidationResult,
  SignerInfo,
  ValidationData,
} from "@/utils/types";
import { Signer } from "@polkadot/api/types";
import { Context, toEthereum, toPolkadot } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

function validateSubstrateSend(
  { source, destination, formData }: ValidationData,
  { polkadotAccount }: SignerInfo,
) {
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
  return {
    paraInfo: source.paraInfo,
    polkadotAccount,
  };
}

async function validateEthereumSend(
  { destination, formData }: ValidationData,
  { ethereumAccount, ethereumProvider }: SignerInfo,
) {
  if (destination.type !== "substrate") {
    throw Error(`Invalid form state: destination type mismatch.`);
  }
  if (destination.paraInfo === undefined) {
    throw Error(`Invalid form state: destination does not have parachain id.`);
  }
  if (!ethereumProvider) throw Error(`Ethereum Wallet not connected.`);
  if (!ethereumAccount) throw Error(`Wallet account not selected.`);
  if (ethereumAccount !== formData.sourceAccount) {
    throw Error(`Selected account does not match source data.`);
  }
  const signer = await ethereumProvider.getSigner(ethereumAccount);
  if (signer.address.toLowerCase() !== formData.sourceAccount.toLowerCase()) {
    throw Error(`Source account mismatch.`);
  }
  return {
    ethereumAccount,
    ethereumProvider,
    paraInfo: destination.paraInfo,
    signer,
  };
}

async function planSend(
  context: Context,
  data: ValidationData,
  signerInfo: SignerInfo,
): Promise<SendValidationResult> {
  const { source, amountInSmallestUnit, formData } = data;
  switch (source.type) {
    case "substrate": {
      const { paraInfo, polkadotAccount } = validateSubstrateSend(
        data,
        signerInfo,
      );
      const walletSigner = {
        address: polkadotAccount.address,
        signer: polkadotAccount.signer! as Signer,
      };
      const plan = await toEthereum.validateSend(
        context,
        walletSigner,
        paraInfo.paraId,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
      );
      console.log(plan);
      if (plan.failure) {
        throw Error(`Invalid form state: cannot infer source type.`, {
          cause: plan.failure,
        });
      }
      return plan;
    }
    case "ethereum": {
      const { paraInfo, signer } = await validateEthereumSend(data, signerInfo);
      const plan = await toPolkadot.validateSend(
        context,
        signer,
        formData.beneficiary,
        formData.token,
        paraInfo.paraId,
        amountInSmallestUnit,
        paraInfo.destinationFeeDOT,
        {
          maxConsumers: paraInfo.maxConsumers,
          ignoreExistentialDeposit: paraInfo.skipExistentialDepositCheck,
        },
      );
      console.log(plan);
      if (plan.failure) {
        throw Error(`Invalid form state: cannot infer source type.`, {
          cause: plan.failure,
        });
      }
      return plan;
    }
    default:
      throw Error(`Invalid form state: cannot infer source type.`);
  }
}

async function sendToken(
  context: Context,
  data: ValidationData,
  plan: SendValidationResult,
  signerInfo: SignerInfo,
): Promise<SendResult> {
  switch (data.source.type) {
    case "substrate": {
      const { polkadotAccount } = validateSubstrateSend(data, signerInfo);
      const walletSigner = {
        address: polkadotAccount.address,
        signer: polkadotAccount.signer! as Signer,
      };
      const result = await toEthereum.send(
        context,
        walletSigner,
        plan as toEthereum.SendValidationResult,
      );
      console.log(result);
      if (!result.success) {
        throw Error(`Send token failed.`, {
          cause: result.failure,
        });
      }
      return result;
    }
    case "ethereum": {
      const { signer } = await validateEthereumSend(data, signerInfo);
      const result = await toPolkadot.send(
        context,
        signer,
        plan as toPolkadot.SendValidationResult,
      );
      console.log(result);
      if (!result.success) {
        throw Error(`Send token failed.`, {
          cause: result.failure,
        });
      }
      return result;
    }
    default: {
      throw Error(`Invalid form state: cannot infer source type.`);
    }
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
      return await planSend(context, data, {
        polkadotAccount: polkadotAccount ?? undefined,
        ethereumAccount: ethereumAccount ?? undefined,
        ethereumProvider: ethereumProvider ?? undefined,
      });
    },
    [context, polkadotAccount, ethereumAccount, ethereumProvider],
  );
  const send = useCallback(
    async (data: ValidationData, plan: SendValidationResult) => {
      if (context === null) return;
      return await sendToken(context, data, plan, {
        polkadotAccount: polkadotAccount ?? undefined,
        ethereumAccount: ethereumAccount ?? undefined,
        ethereumProvider: ethereumProvider ?? undefined,
      });
    },
    [context, polkadotAccount, ethereumAccount, ethereumProvider],
  );
  return [plan, send];
}
