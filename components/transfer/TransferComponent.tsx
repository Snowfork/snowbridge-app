"use client";

import { useSendToken } from "@/hooks/useSendToken";
import { useTransferHistory } from "@/hooks/useTransferHistory";
import { Transfer, transfersPendingLocalAtom } from "@/store/transferHistory";
import { errorMessage } from "@/utils/errorMessage";
import { TransferFormData } from "@/utils/formSchema";
import { createStepsFromPlan } from "@/utils/sendToken";
import {
  MessageReciept,
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
import { useSetAtom, useAtomValue } from "jotai";
import {
  Dispatch,
  FC,
  SetStateAction,
  Suspense,
  useContext,
  useRef,
  useState,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TransferBusy } from "./TransferBusy";
import { TransferError } from "./TransferError";
import { TransferForm } from "./TransferForm";
import { TransferSteps } from "./TransferSteps";
import { useRouter } from "next/navigation";
import base64url from "base64url";
import { LucideLoaderCircle } from "lucide-react";
import { RegistryContext } from "@/app/providers";
import { TransferSummary } from "./TransferSummary";
import { inferTransferType } from "@/utils/inferTransferType";
import { FinalizeBridgingButton } from "@/components/FinalizeBridgingButton";
import { polkadotAccountsAtom } from "@/store/polkadot";

function sendResultToHistory(
  messageId: string,
  data: ValidationData,
  result: MessageReciept,
): Transfer {
  switch (inferTransferType(data.source, data.destination)) {
    case "toEthereumV2": {
      const sendResult = result as toEthereumV2.MessageReceipt;
      const transfer: historyV2.ToEthereumTransferResult = {
        sourceType: "substrate",
        id: messageId ?? sendResult.messageId,
        status: historyV2.TransferStatus.Pending,
        info: {
          amount: data.amountInSmallestUnit.toString(),
          sourceAddress: data.formData.sourceAccount,
          beneficiaryAddress: data.formData.beneficiary,
          tokenAddress: data.formData.token,
          when: new Date(),
        },
        submitted: {
          block_num: sendResult.blockNumber,
          block_timestamp: 0,
          messageId: messageId ?? sendResult.messageId,
          account_id: data.formData.sourceAccount,
          extrinsic_hash: sendResult.txHash,
          success: sendResult.success,
          bridgeHubMessageId: "",
          sourceParachainId: data.source.parachain!.parachainId,
        },
      };

      return { ...transfer, isWalletTransaction: true };
    }
    case "toPolkadotV2": {
      const sendResult = result as toPolkadotV2.MessageReceipt;
      const transfer: historyV2.ToPolkadotTransferResult = {
        sourceType: "ethereum",
        id: messageId ?? sendResult.messageId,
        status: historyV2.TransferStatus.Pending,
        info: {
          amount: data.amountInSmallestUnit.toString(),
          sourceAddress: data.formData.sourceAccount,
          beneficiaryAddress: data.formData.beneficiary,
          tokenAddress: data.formData.token,
          when: new Date(),
          destinationParachain: data.destination.parachain?.parachainId,
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
        sourceType: "substrate",
        id: messageId ?? sendResult.messageId,
        status: historyV2.TransferStatus.Pending,
        info: {
          amount: data.amountInSmallestUnit.toString(),
          sourceAddress: data.formData.sourceAccount,
          beneficiaryAddress: data.formData.beneficiary,
          tokenAddress: data.formData.token,
          when: new Date(),
          destinationParachain: data.destination.parachain!.parachainId,
        },
        submitted: {
          block_num: sendResult.blockNumber,
          block_timestamp: 0,
          messageId: messageId ?? sendResult.messageId,
          account_id: data.formData.sourceAccount,
          extrinsic_hash: sendResult.txHash,
          success: sendResult.success,
          bridgeHubMessageId: "",
          sourceParachainId: data.source.parachain!.parachainId,
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
  const [busy, setBusy] = useState<string | null>(null);
  const [planSend, sendToken] = useSendToken();
  const router = useRouter();
  const registry = useContext(RegistryContext)!;
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

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
    setSourceExecutionFee: Dispatch<SetStateAction<bigint | null>>,
  ) => {
    const req = requestId.current;
    const transferType = inferTransferType(data.source, data.destination);
    let error = "Some preflight checks failed...";
    try {
      setBusy("Doing some preflight checks...");
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
      setBusy("Preflight checks successful. Submitting transfer...");

      error = "Error submitting transfer.";
      track("Sending Token", { ...data?.formData });

      const result = await sendToken(data, plan);
      if (requestId.current != req) return;

      const messageId = result.messageId ?? "0x";
      const historyItem = sendResultToHistory(messageId, data, result);
      if (historyItem !== null) {
        addPendingTransaction({
          kind: "add",
          transfer: historyItem,
        });
        refreshHistory();
      }
      track("Sending Complete", { ...data.formData, messageId });
      setSourceExecutionFee(null);
      setBusy("Transfer successful...");
      const transferData = base64url.encode(JSON.stringify(historyItem));
      if (transferType !== "forInterParachain") {
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
      showError(error, data.formData);
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
  } else if (busy !== null) {
    if (validationData)
      content = (
        <>
          {summary}
          <TransferBusy
            data={validationData}
            message={busy}
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
    <Card className="w-auto md:w-2/3">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>Transfer Tokens</CardTitle>
          <FinalizeBridgingButton
            polkadotAccount={
              polkadotAccounts && polkadotAccounts.length > 0
                ? polkadotAccounts[0]
                : null
            }
            registry={registry}
          />
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

const Loading = () => {
  return (
    <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
      Loading Transfer Form{" "}
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
    </div>
  );
};
