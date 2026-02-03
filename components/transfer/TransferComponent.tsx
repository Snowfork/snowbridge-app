"use client";

import { useSendToken } from "@/hooks/useSendToken";
import { useTransferActivity } from "@/hooks/useTransferActivity";
import { Transfer, transfersPendingLocalAtom } from "@/store/transferActivity";
import { errorMessage } from "@/utils/errorMessage";
import { TransferFormData } from "@/utils/formSchema";
import { createStepsFromPlan } from "@/utils/sendToken";
import {
  MessageReceipt,
  TransferPlanSteps,
  ValidationData,
} from "@/utils/types";
import {
  forInterParachain,
  historyV2,
  toEthereumV2,
  toPolkadotV2,
} from "@snowbridge/api";
import { track } from "@vercel/analytics";
import { useSetAtom } from "jotai";
import {
  Dispatch,
  FC,
  SetStateAction,
  Suspense,
  useContext,
  useRef,
  useState,
} from "react";
import { Card, CardContent } from "../ui/card";
import { TransferBusy } from "./TransferBusy";
import { TransferError } from "./TransferError";
import { TransferForm } from "./TransferForm";
import { TransferSteps } from "./TransferSteps";
import { useRouter } from "next/navigation";
import base64url from "base64url";
import { BridgeInfoContext } from "@/app/providers";
import { SnowflakeLoader } from "@/components/SnowflakeLoader";
import { TransferSummary } from "./TransferSummary";
import { inferTransferType } from "@/utils/inferTransferType";
import { isHex, u8aToHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";

function sendResultToHistory(
  messageId: string,
  data: ValidationData,
  result: MessageReceipt,
): Transfer {
  let sourceAddress = data.formData.sourceAccount;
  if (!isHex(sourceAddress)) {
    sourceAddress = u8aToHex(decodeAddress(sourceAddress));
  }
  let beneficiaryAddress = data.formData.beneficiary;
  if (!isHex(beneficiaryAddress)) {
    beneficiaryAddress = u8aToHex(decodeAddress(beneficiaryAddress));
  }
  switch (inferTransferType(data.source, data.destination)) {
    case "toEthereumV2": {
      const sendResult = result as toEthereumV2.MessageReceipt;
      const transfer: historyV2.ToEthereumTransferResult = {
        kind: "polkadot",
        id: messageId ?? sendResult.messageId,
        status: sendResult.success
          ? historyV2.TransferStatus.Pending
          : historyV2.TransferStatus.Failed,
        info: {
          amount: data.amountInSmallestUnit.toString(),
          sourceAddress,
          beneficiaryAddress,
          tokenAddress: data.formData.token,
          when: new Date(),
        },
        submitted: {
          block_num: sendResult.blockNumber,
          block_timestamp: 0,
          messageId: messageId ?? sendResult.messageId,
          account_id: sourceAddress,
          extrinsic_hash: sendResult.txHash,
          success: sendResult.success,
          bridgeHubMessageId: "",
          sourceParachainId: data.source.parachain!.id,
        },
      };

      return { ...transfer, isWalletTransaction: true };
    }
    case "toPolkadotV2": {
      const sendResult = result as toPolkadotV2.MessageReceipt;
      const transfer: historyV2.ToPolkadotTransferResult = {
        kind: "ethereum",
        id: messageId ?? sendResult.messageId,
        status: historyV2.TransferStatus.Pending,
        info: {
          amount: data.amountInSmallestUnit.toString(),
          sourceAddress,
          beneficiaryAddress,
          tokenAddress: data.formData.token,
          when: new Date(),
          destinationParachain: data.destination.parachain?.id,
        },
        submitted: {
          blockNumber: sendResult.blockNumber ?? 0,
          channelId: sendResult.channelId,
          messageId: messageId ?? sendResult.messageId,
          transactionHash: sendResult.txHash ?? "",
          nonce: Number(sendResult.nonce.toString()),
        },
      };

      return { ...transfer, isWalletTransaction: true };
    }
    case "forInterParachain": {
      const sendResult = result as forInterParachain.MessageReceipt;
      const transfer: historyV2.InterParachainTransfer = {
        kind: "polkadot",
        id: messageId ?? sendResult.messageId,
        status: sendResult.success
          ? historyV2.TransferStatus.Pending
          : historyV2.TransferStatus.Failed,
        info: {
          amount: data.amountInSmallestUnit.toString(),
          sourceAddress,
          beneficiaryAddress,
          tokenAddress: data.formData.token,
          when: new Date(),
          destinationParachain: data.destination.parachain!.id,
        },
        submitted: {
          block_num: sendResult.blockNumber,
          block_timestamp: 0,
          messageId: messageId ?? sendResult.messageId,
          account_id: sourceAddress,
          extrinsic_hash: sendResult.txHash,
          success: sendResult.success,
          bridgeHubMessageId: "",
          sourceParachainId: data.source.parachain!.id,
        },
      };
      return { ...transfer, isWalletTransaction: true };
    }
  }
}

export const TransferComponent: FC = () => {
  const requestId = useRef(0);
  const [formData, setFormData] = useState<TransferFormData>();
  const [validationData, setValidationData] = useState<ValidationData>();
  const [plan, setPlanData] = useState<TransferPlanSteps>();
  const [error, setError] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<{
    message: string;
    isSuccess: boolean;
  } | null>(null);
  const setBusy = (message: string | null, isSuccess = false) => {
    setBusyState(message ? { message, isSuccess } : null);
  };
  const [planSend, sendToken] = useSendToken();
  const router = useRouter();
  const { registry, routes } = useContext(BridgeInfoContext)!;

  const { mutate: refreshHistory } = useTransferActivity();
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
    setSourceExecutionFee: Dispatch<SetStateAction<bigint | null>>,
  ) => {
    const req = requestId.current;
    const transferType = inferTransferType(data.source, data.destination);
    let error = "Transaction cannot be sent, because:";
    try {
      setBusy("Checking transfer details.");
      track("Validate Send", { ...data?.formData });

      setValidationData(data);
      setFormData(data.formData);

      const plan = await planSend(data);
      if (requestId.current != req) return;

      switch (transferType) {
        case "toPolkadotV2":
          {
            const p = plan as toPolkadotV2.ValidationResult;
            setSourceExecutionFee(p.data.feeInfo?.executionFee ?? null);
          }
          break;
        case "toEthereumV2":
        case "forInterParachain":
          {
            const p = plan as
              | toEthereumV2.ValidationResult
              | forInterParachain.ValidationResult;
            setSourceExecutionFee(p.data.sourceExecutionFee);
          }
          break;
      }

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
      setBusy("Please approve transaction in wallet.", true);

      error = "Error submitting transfer.";
      track("Sending Token", { ...data?.formData });

      const result = await sendToken(data, plan);
      if (requestId.current != req) return;

      const messageId = result.messageId ?? "0x";
      const historyItem = sendResultToHistory(messageId, data, result);
      track("Sending Complete", { ...data.formData, messageId });
      setSourceExecutionFee(null);
      setBusy("Transfer successful...", true);
      const transferData = base64url.encode(JSON.stringify(historyItem));
      if (transferType !== "forInterParachain") {
        if (historyItem !== null) {
          addPendingTransaction({
            kind: "add",
            transfer: historyItem,
          });
          refreshHistory();
        }
        router.push(`/txcomplete?transfer=${transferData}`);
      } else {
        router.push(`/localtxcomplete?transfer=${transferData}`);
      }
    } catch (err) {
      console.error(err);
      if (requestId.current != req) return;
      const message = errorMessage(err);
      track("Plan Failed Exception", {
        ...data?.formData,
        message,
      });
      showError(message, data.formData);
    }
  };

  const [sourceExecutionFee, setSourceExecutionFee] = useState<bigint | null>(
    null,
  );

  let summary = <></>;
  if (validationData) {
    summary = (
      <TransferSummary
        data={validationData}
        executionFee={sourceExecutionFee}
      />
    );
  }
  let content;
  if (error !== null) {
    content = (
      <>
        {summary}
        <TransferError
          message={error}
          plan={plan}
          data={validationData}
          onBack={() => {
            backToForm(formData);
            setSourceExecutionFee(null);
          }}
        />
      </>
    );
  } else if (busyState !== null) {
    if (validationData)
      content = (
        <>
          {summary}
          <TransferBusy
            data={validationData}
            message={busyState.message}
            isSuccess={busyState.isSuccess}
            onBack={() => {
              backToForm(formData);
              setSourceExecutionFee(null);
            }}
          />
        </>
      );
  } else if (plan && validationData) {
    content = (
      <>
        {summary}
        <TransferSteps
          plan={plan}
          data={validationData}
          registry={registry}
          onBack={() => {
            backToForm(formData);
            setSourceExecutionFee(null);
          }}
          onRefreshTransfer={async (_, refreshOnly) =>
            await validateAndSubmit(
              validationData,
              refreshOnly ?? false,
              setSourceExecutionFee,
            )
          }
        />
      </>
    );
  } else if (!plan) {
    content = (
      <Suspense fallback={<Loading />}>
        <TransferForm
          assetRegistry={registry}
          formData={validationData?.formData ?? formData}
          routes={routes}
          onValidated={async (data) =>
            await validateAndSubmit(data, false, setSourceExecutionFee)
          }
          onError={async (form, error) =>
            showError("Error validating transfer form.", form)
          }
        />
      </Suspense>
    );
  }

  return (
    <Card className="w-full max-w-[min(42rem,calc(100vw-2rem))] glass border-white/60">
      <CardContent>{content}</CardContent>
    </Card>
  );
};

const Loading = () => {
  return <SnowflakeLoader size="md" />;
};
