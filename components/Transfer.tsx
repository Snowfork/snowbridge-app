"use client";

import { useTransferHistory } from "@/hooks/useTransferHistory";
import {
  ethereumAccountAtom,
  ethereumAccountsAtom,
  ethersProviderAtom,
} from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import {
  assetErc20MetaDataAtom,
  relayChainNativeAssetAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { transfersPendingLocalAtom } from "@/store/transferHistory";
import { doApproveSpend } from "@/utils/doApproveSpend";
import { doDepositAndApproveWeth } from "@/utils/doDepositAndApproveWeth";
import { errorMessage } from "@/utils/errorMessage";
import { TransferFormData, transferFormSchema } from "@/utils/formSchema";
import { onSubmit } from "@/utils/onSubmit";
import { ErrorInfo } from "@/utils/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { assets } from "@snowbridge/api";
import { track } from "@vercel/analytics";
import { parseUnits } from "ethers";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { FC, useCallback, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { BusyDialog } from "./BusyDialog";
import { SendErrorDialog } from "./SendErrorDialog";
import { TransferForm } from "./TransferForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export const Transfer: FC = () => {
  // const depositAndApproveWeth = useCallback(async () => {
  //   if (
  //     tokenMetadata == null ||
  //     context == null ||
  //     sourceAccount == undefined
  //   ) {
  //     return;
  //   }
  //   const toastTitle = "Deposit and Approve Token Spend";
  //   setBusyMessage("Depositing and approving spend...");
  //   try {
  //     const formData = form.getValues();
  //     track("Deposit And Approve", formData);
  //     await doDepositAndApproveWeth(
  //       context,
  //       ethereumProvider,
  //       formData.token,
  //       parseUnits(formData.amount, tokenMetadata.decimals),
  //     );
  //     toast.info(toastTitle, {
  //       position: "bottom-center",
  //       closeButton: true,
  //       id: "deposit_approval_result",
  //       description: "Token spend allowance approval was succesful.",
  //       important: true,
  //     });
  //     //updateBalance(
  //     //  context,
  //     //  snowbridgeEnvironment,
  //     //  source,
  //     //  sourceAccount,
  //     //  token,
  //     //  tokenMetadata,
  //     //  setBalanceDisplay,
  //     //  setError,
  //     //);
  //     track("Deposit And Approve Success", formData);
  //   } catch (err: any) {
  //     console.error(err);
  //     const formData = form.getValues();
  //     const message = `Token spend allowance approval failed.`;
  //     track("Deposit And Approve Failed", {
  //       ...formData,
  //       message: errorMessage(err),
  //     });
  //     toast.error(toastTitle, {
  //       position: "bottom-center",
  //       closeButton: true,
  //       duration: 20000,
  //       id: "deposit_approval_result",
  //       description: message,
  //       important: true,
  //     });
  //   } finally {
  //     setBusyMessage("");
  //     setError(null);
  //   }
  // }, [
  //   context,
  //   ethereumProvider,
  //   form,
  //   setBusyMessage,
  //   setError,
  //   tokenMetadata,
  //   sourceAccount,
  // ]);

  // const approveSpend = useCallback(async () => {
  //   if (tokenMetadata == null || context == null || sourceAccount == undefined)
  //     return;
  //   const toastTitle = "Approve Token Spend";
  //   setBusyMessage("Approving spend...");
  //   try {
  //     const formData = form.getValues();
  //     track("Approve Spend", formData);
  //     await doApproveSpend(
  //       context,
  //       ethereumProvider,
  //       formData.token,
  //       parseUnits(formData.amount, tokenMetadata.decimals),
  //     );
  //     toast.info(toastTitle, {
  //       position: "bottom-center",
  //       closeButton: true,
  //       id: "approval_result",
  //       description: "Token spend allowance approval was succesful.",
  //       important: true,
  //     });
  //     //updateBalance(
  //     //  context,
  //     //  snowbridgeEnvironment,
  //     //  source,
  //     //  sourceAccount,
  //     //  token,
  //     //  tokenMetadata,
  //     //  setError,
  //     //);
  //     track("Approve Spend Success", formData);
  //   } catch (err: any) {
  //     console.error(err);
  //     const formData = form.getValues();
  //     const message = `Token spend allowance approval failed.`;
  //     track("Approve Spend Success", {
  //       ...formData,
  //       message: errorMessage(err),
  //     });
  //     toast.error(toastTitle, {
  //       position: "bottom-center",
  //       closeButton: true,
  //       duration: 20000,
  //       id: "approval_result",
  //       description: message,
  //       important: true,
  //     });
  //   } finally {
  //     setBusyMessage("");
  //     setError(null);
  //   }
  // }, [
  //   context,
  //   ethereumProvider,
  //   setBusyMessage,
  //   setError,
  //   sourceAccount,
  //   tokenMetadata,
  // ]);

  return (
    <Card className="w-auto md:w-2/3">
      <CardHeader>
        <CardTitle>Transfer</CardTitle>
        <CardDescription className="hidden md:flex">
          Transfer tokens between Ethereum and Polkadot parachains.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TransferForm
          onValidated={async (form) => {
            console.log("validated", form);
          }}
          onError={async (error) => {
            console.log("error", error);
          }}
          onMessage={async (message) => {
            console.log("message", message);
          }}
        />
      </CardContent>
    </Card>
  );
};
