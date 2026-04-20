import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { snowbridgeApiAtom } from "@/store/snowbridge";
import { ContractResponse, ValidationData } from "@/utils/types";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { isHex, u8aToHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";

export function useCreateAgent(): (
  _: ValidationData,
) => Promise<ContractResponse> {
  const api = useAtomValue(snowbridgeApiAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  return useCallback(
    async (data: ValidationData) => {
      if (
        api === null ||
        ethereumProvider === null ||
        ethereumAccount === null
      ) {
        throw Error(`Provider or context has changed.`);
      }

      let accountInHex = data.formData.sourceAccount;
      if (!isHex(accountInHex)) {
        accountInHex = u8aToHex(decodeAddress(accountInHex));
      }
      const agentCreation = api.createAgent();
      const tx = await agentCreation.tx(
        data.formData.beneficiary,
        await agentCreation.agentIdForAccount(data.source.id, accountInHex),
      );

      const plan = await agentCreation.validate(tx);
      if (!plan.success)
        throw Error(`Could not create agent ${JSON.stringify(plan.logs)}`);

      const signer = await ethereumProvider.getSigner();
      const signerAddress = await signer.getAddress();
      if (
        signerAddress.toLowerCase() !==
          data.formData.beneficiary.toLowerCase() ||
        signerAddress.toLowerCase() !== ethereumAccount.toLowerCase()
      ) {
        throw Error("Selected signer does not match source address.");
      }
      const response = await signer.sendTransaction(tx.tx);

      console.log("create agent response", response);
      const FIVE_MINUTES = 60_000 * 5;
      const receipt = await response.wait(1, FIVE_MINUTES);
      console.log("create agent receipt", receipt);
      return { receipt, response };
    },
    [api, ethereumProvider, ethereumAccount],
  );
}
