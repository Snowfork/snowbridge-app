"use client";

import { FC, useRef, useState } from "react";
import { TransferForm } from "./TransferForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { TransferFormData } from "@/utils/formSchema";
import { track } from "@vercel/analytics";
import { planSend } from "@/utils/onSubmit";
import { errorMessage } from "@/utils/errorMessage";
import { usePlanSendToken, useSendToken } from "@/hooks/usePlanSendToken";
import { ValidationData } from "@/utils/types";
import { toEthereum, toPolkadot } from "@snowbridge/api";

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

  const requestId = useRef(0);
  const [formData, setFormData] = useState<TransferFormData>();
  const [validationData, setValidationData] = useState<ValidationData | null>(
    null,
  );
  const [plan, setPlanData] = useState<
    toEthereum.SendValidationResult | toPolkadot.SendValidationResult | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [planSend, sendToken] = useSendToken();

  const cancelForm = () => {
    setSuccess(null);
    setError(null);
    setBusy(null);
    setValidationData(null);
    setPlanData(null);
    setFormData(undefined);
    requestId.current = requestId.current + 1;
  };
  const backToForm = (formData?: TransferFormData) => {
    setFormData(formData);
    setValidationData(null);
    setError(null);
    setBusy(null);
    setPlanData(null);
    setSuccess(null);
    requestId.current = requestId.current + 1;
  };
  const showError = (message: string, formData?: TransferFormData) => {
    setFormData(formData);
    setError(message);
    setValidationData(null);
    setBusy(null);
    setPlanData(null);
    setSuccess(null);
  };

  let content;
  if (error !== null) {
    content = <div onClick={() => backToForm(formData)}>{error}</div>;
  } else if (busy !== null) {
    content = <div onClick={() => backToForm(formData)}>{busy}</div>;
  } else if (plan === null) {
    content = (
      <TransferForm
        formData={validationData?.formData ?? formData}
        onValidated={async (data) => {
          const req = requestId.current;
          try {
            setValidationData(data);
            setFormData(data.formData);
            setBusy("Busy planning token transfer...");
            track("Validate Send", { ...data?.formData });
            const plan = await planSend(data);
            if (requestId.current != req) return;
            setPlanData(plan ?? null);
            setBusy(null);
          } catch (err) {
            if (requestId.current != req) return;
            console.error(err);
            const message = errorMessage(err);
            track("Plan Failed Exception", {
              ...data?.formData,
              message,
            });
            showError(errorMessage(error), data.formData);
          }
        }}
        onError={async (form, error) => showError(errorMessage(error), form)}
      />
    );
  } else if (success !== null) {
    content = (
      <div>
        <div>Success</div>
        <div>Estimate delivery time</div>
        <div>Link to history page.</div>
        <div onClick={() => cancelForm()}>Make another Transfer</div>
      </div>
    );
  } else if (plan !== null) {
    content = (
      <div>
        <div>Transfer Summary with fees and estimated delivery time</div>
        <div>Step 1: Deposit</div>
        <div>Step 2: Approve</div>
        <div>Step 3: Existential Deposit</div>
        <div onClick={() => setSuccess("")}>Step 4: Transfer</div>
        <div onClick={() => backToForm(formData)}>Back</div>
        <div onClick={() => cancelForm()}>Cancel</div>
      </div>
    );
  } else {
    content = <div>Should never reach</div>;
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
