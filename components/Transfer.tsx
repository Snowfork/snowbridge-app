"use client";

import { FC, useState } from "react";
import { TransferForm } from "./TransferForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { TransferFormData } from "@/utils/formSchema";

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

  const [formData, setFormData] = useState<TransferFormData | null>(null);
  const [validation, setValidationData] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  let content;
  if (busy !== null) {
    content = <div>Busy</div>;
  } else if (validation === null) {
    content = (
      <TransferForm
        formData={formData}
        onValidated={async (form) => {
          setFormData(form);
          console.log("validated", form);
          setBusy("Validating");
          setBusy(null);
          setValidationData(true);
        }}
        onError={async (error) => {
          console.log("error", error);
          setError(error.toString());
          setBusy(null);
        }}
      />
    );
  } else if (error !== null) {
    content = <div onClick={() => setError(null)}>Bad Bad</div>;
  } else if (success !== null) {
    content = (
      <div>
        <div>Success</div>
        <div>Estimate delivery time</div>
        <div>Link to history page.</div>
        <div
          onClick={() => {
            setValidationData(null);
            setFormData(null);
          }}
        >
          Back to Transfer
        </div>
      </div>
    );
  } else {
    content = (
      <div>
        <div>Transfer Summary with fees and estimated delivery time</div>
        <div>Step 1: Deposit</div>
        <div>Step 2: Approve</div>
        <div>Step 3: Existential Deposit</div>
        <div onClick={() => setSuccess("")}>Step 4: Transfer</div>
        <div onClick={() => setValidationData(null)}>back</div>
        <div
          onClick={() => {
            setValidationData(null);
            setFormData(null);
          }}
        >
          cancel
        </div>
      </div>
    );
  }

  return (
    <Card className="w-auto md:w-2/3">
      <CardHeader>
        <CardTitle>Transfer</CardTitle>
        <CardDescription className="hidden md:flex">
          Transfer tokens between Ethereum and Polkadot parachains.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
