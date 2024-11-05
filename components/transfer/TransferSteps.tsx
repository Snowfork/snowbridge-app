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

interface TransferStepsProps {
  plan: TransferPlanSteps;
  data: ValidationData;
  onBack?: MouseEventHandler;
  onRefreshTransfer?: (data: ValidationData) => Promise<unknown> | unknown;
}

interface StepData {
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  nextStep: () => Promise<unknown> | unknown;
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
          title="Missing existential deposit on destination."
          description={`Beneficiary account requires existential deposit on ${step.data.destination.name}. This step will transfer funds from the relaychain.`}
          amount={"0.1"}
        />
      );
    case TransferStepKind.SubstrateTransferFee:
      return (
        <SubstrateTransferStep
          {...step}
          title="Missing fee on source."
          description={`Source account requires a DOT fee on ${step.data.destination.name}. This step will Transfer funds from the relaychain.`}
          amount={"6.32"}
        />
      );
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
      <div className="flex flex-col my-2 mx-5 gap-4">
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
      <div className="flex flex-col items-center gap-4">
        <Button variant="destructive" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
};
