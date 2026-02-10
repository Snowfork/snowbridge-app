import {
  TransferPlanSteps,
  TransferStep,
  TransferStepKind,
  ValidationData,
  ValidationResult,
} from "@/utils/types";
import { FC, MouseEventHandler, useContext, useState } from "react";
import { Button } from "../ui/button";
import { EthereumTxStep } from "./EthereumTxStep";
import { SubstrateTransferStep } from "./SubstrateTransferStep";
import { useERC20DepositAndApprove } from "@/hooks/useERC20DepositAndApprove";
import { useCreateAgent } from "@/hooks/useCreateAgent";
import { formatUnits, parseUnits } from "ethers";
import { RefreshButton } from "../RefreshButton";
import { toEthereumV2 } from "@snowbridge/api";
import { BridgeInfoContext } from "@/app/providers";
import { AssetRegistry } from "@snowbridge/base-types";
import { NeuroWebWrapStep } from "./NeuroWebUnwrapStep";
import { chainName } from "@/utils/chainNames";
import { CreateAgentStep } from "./CreateAgentStep";

interface TransferStepsProps {
  plan: TransferPlanSteps;
  data: ValidationData;
  registry: AssetRegistry;
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
  plan: ValidationResult;
  nextStep: () => Promise<unknown> | unknown;
}

function TransferFeeStep(step: StepData) {
  const { registry: assetRegistry } = useContext(BridgeInfoContext)!;
  const feeInfo = step.data.fee;
  if (!feeInfo) {
    return (
      <div key={step.id} className="flex flex-col gap-4 justify-between">
        Fetching fee...
      </div>
    );
  }
  if (feeInfo.symbol !== assetRegistry.relaychain.tokenSymbols) {
    return (
      <div key={step.id} className="flex flex-col gap-4 justify-between">
        Expecting {assetRegistry.relaychain.tokenSymbols} as fee asset, found{" "}
        {feeInfo.symbol}.
      </div>
    );
  }

  const transferFee = parseUnits("0.2", feeInfo.decimals);
  const fee = formatUnits(feeInfo.fee + transferFee, feeInfo.decimals);
  const name = chainName(step.data.source);
  return (
    <SubstrateTransferStep
      {...step}
      title={`Missing fee on ${name}.`}
      description={`Source account requires a fee on ${name}. This step will Transfer funds from the relaychain.`}
      defaultAmount={fee}
    />
  );
}

function TransferStepView(step: StepData) {
  const { depositWeth, approveSpend } = useERC20DepositAndApprove();
  const createAgent = useCreateAgent();
  switch (step.step.kind) {
    case TransferStepKind.CreateAgent: {
      return (
        <CreateAgentStep
          {...step}
          title="Create an Proxy."
          description="Create a proxy account on Ethereum to act on behalf of your Polkadot account."
          action={createAgent}
          errorMessage="Error submitting create."
          submitButtonText="Create"
        />
      );
    }
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
          title={`Missing existential deposit on ${chainName(step.data.destination)}.`}
          description={`Beneficiary account requires existential deposit on ${chainName(step.data.destination)}. The existential deposit allows the account to remain open and hold assets. This step will transfer funds from the relaychain.`}
          defaultAmount={"0.2"}
        />
      );
    case TransferStepKind.SubstrateTransferFee:
      return <TransferFeeStep {...step} />;
    case TransferStepKind.WrapNeuroWeb:
      return (
        <NeuroWebWrapStep
          {...step}
          defaultAmount={step.data.amountInSmallestUnit.toString()}
          messageId={
            (step.plan as toEthereumV2.ValidationResult).transfer?.computed
              ?.messageId
          }
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
      <h3 className="text-2xl font-semibold leading-none tracking-tight mt-7">
        Steps
      </h3>
      <div className="flex flex-col gap-4 mt-5">
        {plan.steps.map((step, i) => (
          <TransferStepView
            key={i}
            id={i + 1}
            step={step}
            data={data}
            plan={plan.plan}
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
              className="w-full my-1 action-button"
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
      <div className="flex items-center gap-2 justify-end">
        <RefreshButton
          className={"glass-button mt-2"}
          onClick={async () => {
            if (onRefreshTransfer) await onRefreshTransfer(data, true);
          }}
        />
        <Button variant="link" onClick={onBack} className={"glass-button mt-2"}>
          Back
        </Button>
      </div>
    </div>
  );
};
