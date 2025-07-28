import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { ContractResponse, ValidationData } from "@/utils/types";
import { toPolkadotV2 } from "@snowbridge/api";
import { parseUnits } from "ethers";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

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
      const approveTx = await toPolkadotV2.approveTokenSpend(
        context,
        signerAddress,
        data.formData.token,
        parseUnits(amount, data.tokenMetadata.decimals),
      );

      const response = await signer.sendTransaction(approveTx);

      console.log("approval response", response);
      const FIVE_MINUTES = 60_000 * 5;
      const receipt = await response.wait(1, FIVE_MINUTES);
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
      const depositTx = await toPolkadotV2.depositWeth(
        signerAddress,
        data.formData.token,
        parseUnits(amount, data.tokenMetadata.decimals),
      );
      const response = await signer.sendTransaction(depositTx);
      console.log("deposit response", response);
      const FIVE_MINUTES = 60_000 * 5;
      const receipt = await response.wait(1, FIVE_MINUTES);
      console.log("deposit receipt", receipt);
      return { receipt, response };
    },
    [context, ethereumAccount, ethereumProvider],
  );

  return { approveSpend, depositWeth };
}
