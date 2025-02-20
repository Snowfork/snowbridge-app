"use client";

import { useSendToken } from "@/hooks/useSendToken";
import { useTransferHistory } from "@/hooks/useTransferHistory";
import { Transfer, transfersPendingLocalAtom } from "@/store/transferHistory";
import { errorMessage } from "@/utils/errorMessage";
import { TransferFormData } from "@/utils/formSchema";
import { createStepsFromPlan } from "@/utils/sendToken";
import { SendResult, TransferPlanSteps, ValidationData } from "@/utils/types";
import { history, toEthereum, toPolkadot } from "@snowbridge/api";
import { track } from "@vercel/analytics";
import { useSetAtom } from "jotai";
import { FC, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TransferBusy } from "./TransferBusy";
import { TransferError } from "./TransferError";
import { TransferForm } from "./TransferForm";
import { TransferSteps } from "./TransferSteps";
import { useRouter } from "next/navigation";
import base64url from "base64url";

function sendResultToHistory(
  messageId: string,
  data: ValidationData,
  result: SendResult,
): Transfer {
  switch (data.source.type) {
    case "ethereum": {
      const sendResult = result as toPolkadot.SendResult;
      const transfer: history.ToPolkadotTransferResult = {
        id: messageId,
        status: history.TransferStatus.Pending,
        info: {
          amount: data.amountInSmallestUnit.toString(),
          sourceAddress: data.formData.sourceAccount,
          beneficiaryAddress: data.formData.beneficiary,
          tokenAddress: data.formData.token,
          when: new Date(),
          destinationParachain: data.destination.parachain?.parachainId,
          destinationFee:
            data.destination.parachain?.destinationFeeInDOT.toString(),
        },
        submitted: {
          blockHash: sendResult.success?.ethereum.blockHash ?? "",
          blockNumber: sendResult.success?.ethereum.blockNumber ?? 0,
          channelId: "",
          messageId: messageId,
          logIndex: 0,
          transactionIndex: 0,
          transactionHash: sendResult.success?.ethereum.transactionHash ?? "",
          nonce: 0,
          parentBeaconSlot: 0,
        },
      };

      return { ...transfer, isWalletTransaction: true };
    }
    case "substrate": {
      const sendResult = result as toEthereum.SendResult;
      const transfer: history.ToEthereumTransferResult = {
        id: messageId,
        status: history.TransferStatus.Pending,
        info: {
          amount: data.amountInSmallestUnit.toString(),
          sourceAddress: data.formData.sourceAccount,
          beneficiaryAddress: data.formData.beneficiary,
          tokenAddress: data.formData.token,
          when: new Date(),
        },
        submitted: {
          block_hash:
            sendResult.success?.sourceParachain?.blockHash ??
            sendResult.success?.assetHub.blockHash ??
            "",
          block_num:
            sendResult.success?.sourceParachain?.blockNumber ??
            sendResult.success?.assetHub.blockNumber ??
            0,
          block_timestamp: 0,
          messageId: messageId,
          account_id: data.formData.sourceAccount,
          bridgeHubMessageId: "",
          extrinsic_hash:
            sendResult.success?.sourceParachain?.txHash ??
            sendResult.success?.assetHub.txHash ??
            "",
          extrinsic_index:
            sendResult.success?.sourceParachain !== undefined
              ? sendResult.success.sourceParachain.blockNumber.toString() +
                "-" +
                sendResult.success.sourceParachain.txIndex.toString()
              : sendResult.success?.assetHub !== undefined
                ? sendResult.success?.assetHub?.blockNumber.toString() +
                  "-" +
                  sendResult.success?.assetHub.txIndex.toString()
                : "unknown",

          relayChain: {
            block_hash: sendResult.success?.relayChain.submittedAtHash ?? "",
            block_num: 0,
          },
          success: true,
        },
      };

      return { ...transfer, isWalletTransaction: true };
    }
    default:
      throw Error(`Unknown type '${data.source.type}'`);
  }
}

export const TransferComponent: FC = () => {
  const requestId = useRef(0);
  const [formData, setFormData] = useState<TransferFormData>();
  const [validationData, setValidationData] = useState<ValidationData>();
  const [plan, setPlanData] = useState<TransferPlanSteps>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [planSend, sendToken] = useSendToken();
  const router = useRouter();

  const { mutate: refreshHistory } = useTransferHistory();
  const addPendingTransaction = useSetAtom(transfersPendingLocalAtom);

  const backToForm = (formData?: TransferFormData) => {
    setFormData(formData);
    setValidationData(undefined);
    setError(null);
    setBusy(null);
    setPlanData(undefined);
    requestId.current = requestId.current + 1;
  };
  const showError = (message: string, formData?: TransferFormData) => {
    setFormData(formData);
    setError(message);
    setValidationData(undefined);
    setBusy(null);
    setPlanData(undefined);
    requestId.current = requestId.current + 1;
  };
  const validateAndSubmit = async (
    data: ValidationData,
    refreshOnly: boolean,
  ) => {
    const req = requestId.current;
    let error = "Some preflight checks failed...";
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
        setError(error);
        setBusy(null);
        return;
      }
      if (steps.steps.length > 0 || !plan.success || refreshOnly) {
        setBusy(null);
        return;
      }

      error = "Error submitting transfer.";
      setBusy("Submitting transfer...");
      track("Sending Token", { ...data?.formData });

      const result = await sendToken(data, plan);
      if (requestId.current != req) return;

      setBusy(null);
      if (result.success) {
        const messageId = result.success?.messageId ?? "0x";
        const historyItem = sendResultToHistory(messageId, data, result);
        addPendingTransaction({
          kind: "add",
          transfer: historyItem,
        });
        refreshHistory();
        track("Sending Complete", { ...data.formData, messageId });
        const transferData = base64url.encode(JSON.stringify(historyItem));
        router.push(`/txcomplete?transfer=${transferData}`);
      } else {
        track("Sending Failed", { ...data.formData });
        // TODO: make error link and console log underlying error
        showError("Sending failed", data.formData);
      }
    } catch (err) {
      console.error(err);
      if (requestId.current != req) return;
      const message = errorMessage(err);
      track("Plan Failed Exception", {
        ...data?.formData,
        message,
      });
      showError(error, data.formData);
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
      <TransferBusy
        data={validationData}
        message={busy}
        onBack={() => backToForm(formData)}
      />
    );
  } else if (plan && validationData) {
    content = (
      <TransferSteps
        plan={plan}
        data={validationData}
        onBack={() => backToForm(formData)}
        onRefreshTransfer={async (_, refreshOnly) =>
          await validateAndSubmit(validationData, refreshOnly ?? false)
        }
      />
    );
  } else if (!plan) {
    content = (
      <TransferForm
        formData={validationData?.formData ?? formData}
        onValidated={async (data) => await validateAndSubmit(data, false)}
        onError={async (form, error) =>
          showError("Error validating transfer form.", form)
        }
      />
    );
  }

  return (
    <Card className="w-auto md:w-2/3">
      <CardHeader>
        <CardTitle>Transfer Tokens</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
