import {
  TransferPlanSteps,
  TransferStep,
  TransferStepKind,
  ValidationData,
} from "@/utils/types";
import { FC, MouseEventHandler, useState } from "react";
import { Button } from "../ui/button";
import { EthereumTxStep } from "./EthereumTxStep";
import { SubstrateTransferStep } from "./SubstrateTransferStep";
import { TransferSummary } from "./TransferSummary";
import { useERC20DepositAndApprove } from "@/hooks/useERC20DepositAndApprove";
import { useBridgeFeeInfo } from "@/hooks/useBridgeFeeInfo";
import { formatUnits, parseUnits } from "ethers";
import { relayChainNativeAssetAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import { RefreshButton } from "../RefreshButton";

interface TransferStepsProps {
  plan: TransferPlanSteps;
  data: ValidationData;
  onBack?: MouseEventHandler;
  onRefreshTransfer?: (
    data: ValidationData,
    refreshOnly?: boolean,
  ) => Promise<unknown> | unknown;
}

interface StepData {
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  nextStep: () => Promise<unknown> | unknown;
}

function TransferFeeStep(step: StepData) {
  const relaychain = useAtomValue(relayChainNativeAssetAtom);
  const { data: feeInfo, error } = useBridgeFeeInfo(
    step.data.source.type,
    step.data.destination,
    step.data.formData.token,
  );
  if (!feeInfo && error) {
    return (
      <div key={step.id} className="flex flex-col gap-4 justify-between">
        Error fetching fee.
      </div>
    );
  }
  if (!feeInfo) {
    return (
      <div key={step.id} className="flex flex-col gap-4 justify-between">
        Fetching fee...
      </div>
    );
  }
  if (feeInfo.symbol !== relaychain?.tokenSymbol) {
    return (
      <div key={step.id} className="flex flex-col gap-4 justify-between">
        Expecting {relaychain?.tokenSymbol} as fee asset, found {feeInfo.symbol}
        .
      </div>
    );
  }

  const transferFee = parseUnits("0.2", feeInfo.decimals);
  const fee = formatUnits(feeInfo.fee + transferFee, feeInfo.decimals);
  return (
    <SubstrateTransferStep
      {...step}
      title={`Missing fee on ${step.data.source.name}.`}
      description={`Source account requires a fee on ${step.data.source.name}. This step will Transfer funds from the relaychain.`}
      defaultAmount={fee}
    />
  );
}

function TransferStepView(step: StepData) {
  const { depositWeth, approveSpend } = useERC20DepositAndApprove();
  switch (step.step.kind) {
    case TransferStepKind.ApproveERC20:
      return (
        <EthereumTxStep
          {...step}
          title="Approve Snowbridge spender."
          description="Snowbridge needs to be an approved spender to transfer ERC20 tokens. This step will approve the transfer amount."
          action={approveSpend}
          errorMessage="Error submitting approval."
          submitButtonText="Approve"
        />
      );
    case TransferStepKind.DepositWETH:
      return (
        <EthereumTxStep
          {...step}
          title="Wrap ETH to WETH."
          description="ETH needs to be wrapped into WETH to be transfered with Snowbridge. This step will deposit ETH into WETH."
          action={depositWeth}
          errorMessage="Error depositing WETH."
          submitButtonText="Deposit"
        />
      );
    case TransferStepKind.SubstrateTransferED:
      return (
        <SubstrateTransferStep
          {...step}
          title={`Missing existential deposit on ${step.data.destination.name}.`}
          description={`Beneficiary account requires existential deposit on ${step.data.destination.name}. The existential deposit allows the account to remain open and hold assets. This step will transfer funds from the relaychain.`}
          defaultAmount={"0.2"}
        />
      );
    case TransferStepKind.SubstrateTransferFee:
      return <TransferFeeStep {...step} />;
  }
}

export const TransferSteps: FC<TransferStepsProps> = ({
  plan,
  data,
  onBack,
  onRefreshTransfer,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const nextStep = () => setCurrentStep(currentStep + 1);
  return (
    <div>
      <TransferSummary data={data} />
      <p className="text-l font-semibold my-4">Steps</p>
      <div className="flex flex-col m-5 gap-4">
        {plan.steps.map((step, i) => (
          <TransferStepView
            key={i}
            id={i + 1}
            step={step}
            data={data}
            currentStep={currentStep}
            nextStep={nextStep}
          />
        ))}
        <div className="flex flex-col gap-4 justify-between">
          <div
            className={
              currentStep !== plan.steps.length + 1 ? " text-zinc-400" : ""
            }
          >
            Step {plan.steps.length + 1}: Complete Transfer
          </div>
          <div
            className={
              "flex gap-4" +
              (currentStep !== plan.steps.length + 1 ? " hidden" : "")
            }
          >
            <Button
              size="sm"
              onClick={async () => {
                if (onRefreshTransfer) await onRefreshTransfer(data);
              }}
            >
              Transfer
            </Button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 justify-evenly">
        <RefreshButton
          onClick={async () => {
            if (onRefreshTransfer) await onRefreshTransfer(data, true);
          }}
        />
        <Button variant="destructive" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};
