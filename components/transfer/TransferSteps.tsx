import { useERC20DepositAndApprove } from "@/hooks/useERC20DepositAndApprove";
import {
  TransferPlanSteps,
  TransferStep,
  TransferStepKind,
  ValidationData,
} from "@/utils/types";
import { LucideLoaderCircle } from "lucide-react";
import { FC, MouseEventHandler, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SubstrateTransferStep } from "./SubstrateTransferStep";
import { TransferSummary } from "./TransferSummary";

interface TransferStepsProps {
  plan: TransferPlanSteps;
  data: ValidationData;
  onBack?: MouseEventHandler;
  onCompleteTransfer?: (data: ValidationData) => Promise<unknown> | unknown;
}

interface StepData {
  id: number;
  step: TransferStep;
  data: ValidationData;
  currentStep: number;
  nextStep: () => Promise<unknown> | unknown;
}

function ApproveERC20Step({ id, data, currentStep, nextStep }: StepData) {
  const { approveSpend } = useERC20DepositAndApprove();
  const [amount, setAmount] = useState(data.formData.amount);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string>();
  const [error, setError] = useState<string>();
  return (
    <div key={id} className="flex flex-col gap-2 justify-between">
      <div className={currentStep < id ? " text-zinc-400" : ""}>
        Step {id}: Approve Snowbridge spender.
      </div>
      <div
        className={
          "flex gap-2 place-items-center " +
          (currentStep !== id ? " hidden" : "")
        }
      >
        <Label>Amount</Label>
        <Input
          disabled={busy}
          className="w-1/4"
          type="number"
          defaultValue={data.formData.amount}
          onChange={(v) => setAmount(v.target.value)}
        />
        {busy ? (
          <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
        ) : (
          <Button
            size="sm"
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              try {
                const { receipt } = await approveSpend(data, amount);
                setSuccess("Success: " + (receipt?.hash ?? ""));
                nextStep();
              } catch (error: any) {
                console.error(error);
                setError("Error submitting approval.");
              }
              setBusy(false);
            }}
          >
            Approve
          </Button>
        )}
      </div>
      <div className="text-red-500" hidden={!error}>
        {error}
      </div>
      <div className="text-green-500" hidden={!success}>
        {success}
      </div>
    </div>
  );
}

function DepositWETHStep({ id, data, currentStep, nextStep }: StepData) {
  const { depositWeth } = useERC20DepositAndApprove();
  const [amount, setAmount] = useState(data.formData.amount);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string>();
  const [error, setError] = useState<string>();
  return (
    <div key={id} className="flex flex-col gap-2 justify-between">
      <div className={currentStep < id ? " text-zinc-400" : ""}>
        Step {id}: Wrap ETH to WETH.
      </div>
      <div
        className={
          "flex gap-2 place-items-center " +
          (currentStep !== id ? " hidden" : "")
        }
      >
        <Label>Amount</Label>
        <Input
          disabled={busy}
          className="w-1/4"
          type="number"
          defaultValue={data.formData.amount}
          onChange={(v) => setAmount(v.target.value)}
        />
        {busy ? (
          <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
        ) : (
          <Button
            size="sm"
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              try {
                const { receipt } = await depositWeth(data, amount);
                setSuccess("Success: " + (receipt?.hash ?? ""));
                nextStep();
              } catch (error: any) {
                console.error(error);
                setError("Error depositing WETH.");
              }
              setBusy(false);
            }}
          >
            Approve
          </Button>
        )}
      </div>
      <div className="text-red-500" hidden={!error}>
        {error}
      </div>
      <div className="text-green-500" hidden={!success}>
        {success}
      </div>
    </div>
  );
}

function TransferStepView(step: StepData) {
  switch (step.step.kind) {
    case TransferStepKind.ApproveERC20:
      return <ApproveERC20Step {...step} />;
    case TransferStepKind.DepositWETH:
      return <DepositWETHStep {...step} />;
    case TransferStepKind.SubstrateTransferED:
      return (
        <SubstrateTransferStep
          {...step}
          title={`Beneficiary account requires existential deposit on ${step.data.destination.name}.`}
        />
      );
    case TransferStepKind.SubstrateTransferFee:
      return (
        <SubstrateTransferStep
          {...step}
          title={`Source account requires a DOT fee on ${step.data.destination.name}.`}
        />
      );
  }
}

export const TransferSteps: FC<TransferStepsProps> = ({
  plan,
  data,
  onBack,
  onCompleteTransfer,
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
              "flex gap-2" +
              (currentStep !== plan.steps.length + 1 ? " hidden" : "")
            }
          >
            <Button
              size="sm"
              onClick={async () => {
                if (onCompleteTransfer) await onCompleteTransfer(data);
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
