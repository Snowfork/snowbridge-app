import {
  TransferPlanSteps,
  TransferStep,
  TransferStepKind,
  ValidationData,
} from "@/utils/types";
import {
  Dispatch,
  FC,
  MouseEventHandler,
  SetStateAction,
  useState,
} from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface TrasnferStepProps {
  plan: TransferPlanSteps;
  data: ValidationData;
  onBack?: MouseEventHandler | undefined;
}

interface StepData {
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  nextStep: () => void;
}

function ApproveERC20Step({ id, data, currentStep, nextStep }: StepData) {
  return (
    <div key={id} className="flex flex-col gap-2 justify-between">
      <div className={currentStep < id ? " text-zinc-400" : ""}>
        Step {id}: Approve Snowbridge spender.
      </div>
      <div className={"flex gap-2" + (currentStep !== id ? " hidden" : "")}>
        <Input className="w-1/4" type="string" value={data.formData.amount} />
        <Button size="sm" onClick={nextStep}>
          Approve
        </Button>
      </div>
    </div>
  );
}

function DepositWETHStep({ id, step, data, currentStep, nextStep }: StepData) {
  return (
    <div key={id} className="flex flex-col gap-2 justify-between">
      <div className={currentStep < id ? " text-zinc-400" : ""}>
        Step {id}: Wrap ETH to WETH.
      </div>
      <div className={"flex gap-2" + (currentStep !== id ? " hidden" : "")}>
        <Input className="w-1/4" type="string" value={data.formData.amount} />
        <Button size="sm" onClick={nextStep}>
          Deposit
        </Button>
      </div>
    </div>
  );
}

function SubstrateTransferEDStep({
  id,
  step,
  data,
  currentStep,
  nextStep,
}: StepData) {
  return (
    <div key={id} className="flex flex-col gap-2 justify-between">
      <div className={currentStep < id ? " text-zinc-400" : ""}>
        Step {id}: Beneficiary account requires existential deposit on{" "}
        {data.destination.name}.
      </div>
      <div className={"flex gap-2" + (currentStep !== id ? " hidden" : "")}>
        <Input className="w-1/4" type="string" value="0.1" />
        <Button size="sm" onClick={nextStep}>
          Transfer
        </Button>
      </div>
    </div>
  );
}

function SubstrateTransferFeeStep({
  id,
  step,
  data,
  currentStep,
  nextStep,
}: StepData) {
  return (
    <div key={id} className="flex flex-col gap-2 justify-between">
      <div className={currentStep < id ? " text-zinc-400" : ""}>
        Step {id}: {TransferStepKind[step.kind]} Beneficiary account requires
        existential deposit on {data.destination.name}.
      </div>
      <div className={"flex gap-2" + (currentStep !== id ? " hidden" : "")}>
        <Input className="w-1/4" type="string" value="0.1" />
        <Button size="sm" onClick={nextStep}>
          Transfer
        </Button>
      </div>
    </div>
  );
}

function TransferStepView(data: StepData) {
  switch (data.step.kind) {
    case TransferStepKind.ApproveERC20:
      return <ApproveERC20Step {...data} />;
    case TransferStepKind.DepositWETH:
      return <DepositWETHStep {...data} />;
    case TransferStepKind.SubstrateTransferED:
      return <SubstrateTransferEDStep {...data} />;
    case TransferStepKind.SubstrateTransferFee:
      return <SubstrateTransferFeeStep {...data} />;
  }
}

export const TransferSteps: FC<TrasnferStepProps> = ({
  plan,
  data,
  onBack,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const nextStep = () => setCurrentStep(currentStep + 1);
  return (
    <div>
      <div className="my-2">
        <div>
          Send {data.formData.amount} {data.tokenMetadata.symbol} from{" "}
          {data.source.name} to {data.destination.name}.
        </div>
        <div>Source Account: {data.formData.sourceAccount}</div>
        <div>Beneficiary: {data.formData.beneficiary}</div>
        <div>Fees: 2 DOT</div>
        <div>Estimated delivery: 3 hour 2 minutes</div>
      </div>
      <div className="flex flex-col my-2 mx-5 gap-1">
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
        <div className="flex flex-col gap-2 justify-between">
          <div
            className={
              currentStep !== plan.steps.length + 1 ? " text-zinc-400" : ""
            }
          >
            Step {plan.steps.length + 1}: Complete Transfer
          </div>
          <div
            className={
              "flex gap-2" +
              (currentStep !== plan.steps.length + 1 ? " hidden" : "")
            }
          >
            <Button size="sm">Transfer</Button>
          </div>
        </div>
      </div>
      <Button className="w-full" variant="destructive" onClick={onBack}>
        Back
      </Button>
    </div>
  );
};
