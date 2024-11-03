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
import { errorMessage } from "@/utils/errorMessage";
import { useSendToken } from "@/hooks/useSendToken";
import { TransferPlanSteps, ValidationData } from "@/utils/types";
import { createStepsFromPlan } from "@/utils/sendToken";
import { TransferSteps } from "./TransferSteps";

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
  const [validationData, setValidationData] = useState<ValidationData>();
  const [plan, setPlanData] = useState<TransferPlanSteps>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [planSend, sendToken] = useSendToken();

  const cancelForm = () => {
    setSuccess(null);
    setError(null);
    setBusy(null);
    setValidationData(undefined);
    setPlanData(undefined);
    setFormData(undefined);
    requestId.current = requestId.current + 1;
  };
  const backToForm = (formData?: TransferFormData) => {
    setFormData(formData);
    setValidationData(undefined);
    setError(null);
    setBusy(null);
    setPlanData(undefined);
    setSuccess(null);
    requestId.current = requestId.current + 1;
  };
  const showError = (message: string, formData?: TransferFormData) => {
    setFormData(formData);
    setError(message);
    setValidationData(undefined);
    setBusy(null);
    setPlanData(undefined);
    setSuccess(null);
    requestId.current = requestId.current + 1;
  };

  console.log(error, busy, plan, success, formData, validationData);
  let content;
  if (error !== null) {
    content = (
      <>
        <div onClick={() => backToForm(formData)}>{error}</div>
        <div hidden={!plan?.errors}>
          {plan?.errors.map((x, key) => <div key={key}>{x.message}</div>)}
        </div>
      </>
    );
  } else if (busy !== null) {
    content = <div onClick={() => backToForm(formData)}>{busy}</div>;
  } else if (plan && success !== null) {
    content = (
      <div>
        <div>Success</div>
        <div>Estimate delivery time</div>
        <div>Link to history page.</div>
        <div onClick={() => cancelForm()}>Make another Transfer</div>
      </div>
    );
  } else if (plan && validationData && !success) {
    content = (
      <TransferSteps
        plan={plan}
        data={validationData}
        onBack={() => backToForm(formData)}
      />
    );
  } else if (!plan && !success) {
    content = (
      <TransferForm
        formData={validationData?.formData ?? formData}
        onValidated={async (data) => {
          const req = requestId.current;
          try {
            setValidationData(data);
            setFormData(data.formData);
            setBusy("Doing some preflight checks...");
            track("Validate Send", { ...data?.formData });
            const plan = await planSend(data);
            if (requestId.current != req) return;
            const steps = createStepsFromPlan(data, plan);
            setPlanData(steps);
            if (steps.errors.length > 0) {
              setError("Some preflight checks failed...");
            }
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
