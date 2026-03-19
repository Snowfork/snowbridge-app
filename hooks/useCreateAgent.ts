import { BridgeInfoContext } from "@/app/providers";
import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { ContractResponse, ValidationData } from "@/utils/types";
import { toEthereumSnowbridgeV2 } from "@snowbridge/api";
import { CreateAgent } from "@snowbridge/api/src/registration/agent/createAgent";
import { useAtomValue } from "jotai";
import { useCallback, useContext } from "react";
import { isHex, u8aToHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";

export function useCreateAgent(): (
  _: ValidationData,
) => Promise<ContractResponse> {
  const { registry } = useContext(BridgeInfoContext)!;
  const context = useAtomValue(snowbridgeContextAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  return useCallback(
    async (data: ValidationData) => {
      if (
        context === null ||
        ethereumProvider === null ||
        ethereumAccount === null
      ) {
        throw Error(`Provider or context has changed.`);
      }

      let accountInHex = data.formData.sourceAccount;
      if (!isHex(accountInHex)) {
        accountInHex = u8aToHex(decodeAddress(accountInHex));
      }
      const ca = new CreateAgent(context as any, registry);
      const agentId = await toEthereumSnowbridgeV2.sourceAgentId(
        context as any,
        data.source.id,
        accountInHex,
      );
      const tx = await ca.tx(
        data.formData.beneficiary,
        agentId,
      );

      const plan = await ca.validate(tx);
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
      const response = await signer.sendTransaction(tx.tx as any);

      console.log("create agent response", response);
      const FIVE_MINUTES = 60_000 * 5;
      const receipt = await response.wait(1, FIVE_MINUTES);
      console.log("create agent receipt", receipt);
      return { receipt, response };
    },
    [context, registry, ethereumProvider, ethereumAccount],
  );
}
