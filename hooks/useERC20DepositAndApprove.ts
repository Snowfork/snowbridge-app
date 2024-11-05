import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { ValidationData } from "@/utils/types";
import { toPolkadot } from "@snowbridge/api";
import {
  ContractTransactionReceipt,
  ContractTransactionResponse,
  parseUnits,
} from "ethers";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

interface ContractResponse {
  response: ContractTransactionResponse;
  receipt: ContractTransactionReceipt | null;
}
export function useERC20DepositAndApprove(): {
  approveSpend: (
    data: ValidationData,
    amount: string,
  ) => Promise<ContractResponse>;
  depositWeth: (
    data: ValidationData,
    amount: string,
  ) => Promise<ContractResponse>;
} {
  const context = useAtomValue(snowbridgeContextAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);

  const approveSpend = useCallback(
    async (data: ValidationData, amount: string) => {
      if (
        context === null ||
        ethereumProvider === null ||
        ethereumAccount === null
      ) {
        throw Error(`Provider or context has changed.`);
      }
      const signer = await ethereumProvider.getSigner();
      const signerAddress = await signer.getAddress();
      if (
        signerAddress.toLowerCase() !==
          data.formData.sourceAccount.toLowerCase() ||
        signerAddress.toLowerCase() !== ethereumAccount.toLowerCase()
      ) {
        throw Error("Selected signer does not match source address.");
      }
      const response = await toPolkadot.approveTokenSpend(
        context,
        signer,
        data.formData.token,
        parseUnits(amount, data.tokenMetadata.decimals),
      );

      console.log("approval response", response);
      const receipt = await response.wait();
      console.log("approval receipt", receipt);
      return { receipt, response };
    },
    [context, ethereumAccount, ethereumProvider],
  );
  const depositWeth = useCallback(
    async (data: ValidationData, amount: string) => {
      if (
        context === null ||
        ethereumProvider === null ||
        ethereumAccount === null
      ) {
        throw Error(`Provider or context has changed.`);
      }
      const signer = await ethereumProvider.getSigner();
      const signerAddress = await signer.getAddress();
      if (
        signerAddress.toLowerCase() !==
          data.formData.sourceAccount.toLowerCase() ||
        signerAddress.toLowerCase() !== ethereumAccount.toLowerCase()
      ) {
        throw Error("Selected signer does not match source address.");
      }
      const response = await toPolkadot.depositWeth(
        context,
        signer,
        data.formData.token,
        parseUnits(amount, data.tokenMetadata.decimals),
      );
      console.log("deposit response", response);
      const receipt = await response.wait();
      console.log("deposit receipt", receipt);
      return { receipt, response };
    },
    [context, ethereumAccount, ethereumProvider],
  );

  return { approveSpend, depositWeth };
}
