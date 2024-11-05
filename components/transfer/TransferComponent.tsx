"use client";

import { FC, useRef, useState } from "react";
import { TransferForm } from "./TransferForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { TransferFormData } from "@/utils/formSchema";
import { track } from "@vercel/analytics";
import { errorMessage } from "@/utils/errorMessage";
import { useSendToken } from "@/hooks/useSendToken";
import { TransferPlanSteps, ValidationData } from "@/utils/types";
import { createStepsFromPlan } from "@/utils/sendToken";
import { TransferSteps } from "./TransferSteps";
import { TransferBusy } from "./TransferBusy";
import { TransferError } from "./TransferError";

export const TransferComponent: FC = () => {
  const requestId = useRef(0);
  const [formData, setFormData] = useState<TransferFormData>();
  const [validationData, setValidationData] = useState<ValidationData>();
  const [plan, setPlanData] = useState<TransferPlanSteps>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [planSend, sendToken] = useSendToken();

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
  const validateAndSubmit = async (data: ValidationData) => {
    const req = requestId.current;
    try {
      setBusy("Doing some preflight checks...");
      track("Validate Send", { ...data?.formData });

      setValidationData(data);
      setFormData(data.formData);

      const plan = await planSend(data);
      if (requestId.current != req) return;

      const steps = createStepsFromPlan(data, plan);
      setPlanData(steps);

      if (steps.errors.length > 0) {
        setError("Some preflight checks failed...");
        setBusy(null);
        return;
      }
      if (steps.steps.length > 0 || !plan.success) {
        setBusy(null);
        return;
      }

      setBusy("Submitting transfer...");
      track("Sending Token", { ...data?.formData });

      const result = await sendToken(data, plan);
      if (requestId.current != req) return;
      setBusy(null);
      const messageId = result.success?.messageId ?? "0x";
      setSuccess(messageId);
      track("Sending Complete", { ...data?.formData, messageId });
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
  };

  let content;
  if (error !== null) {
    content = (
      <TransferError
        message={error}
        plan={plan}
        data={validationData}
        onBack={() => backToForm(formData)}
      />
    );
  } else if (busy !== null) {
    content = (
      <TransferBusy message={busy} onBack={() => backToForm(formData)} />
    );
  } else if (success !== null) {
    content = (
      <div>
        <div>Success</div>
        <div>Estimate delivery time</div>
        <div>Link to history page.</div>
        <div onClick={() => backToForm()}>Make another Transfer</div>
      </div>
    );
  } else if (plan && validationData && !success) {
    content = (
      <TransferSteps
        plan={plan}
        data={validationData}
        onBack={() => backToForm(formData)}
        onCompleteTransfer={async () => await validateAndSubmit(validationData)}
      />
    );
  } else if (!plan && !success) {
    content = (
      <TransferForm
        formData={validationData?.formData ?? formData}
        onValidated={async (data) => await validateAndSubmit(data)}
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
