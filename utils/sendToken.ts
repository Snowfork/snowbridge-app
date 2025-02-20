import { toEthereum, toPolkadot } from "@snowbridge/api";
import {
  TransferPlanSteps,
  TransferStep,
  TransferStepKind,
  ValidationData,
  ValidationResult,
} from "./types";

export function createStepsFromPlan(
  data: ValidationData,
  plan: ValidationResult,
): TransferPlanSteps {
  const errors = [];
  const steps: TransferStep[] = [];

  switch (data.source.type) {
    case "substrate": {
      const p = plan as toEthereum.SendValidationResult;
      for (const error of p.failure?.errors ?? []) {
        if (
          error.code == toEthereum.SendValidationCode.InsufficientFee &&
          data.source.id === "assethub"
        ) {
          steps.push({
            kind: TransferStepKind.SubstrateTransferFee,
            displayOrder: 10,
          });
        } else {
          errors.push(error);
        }
      }
      return {
        steps,
        errors,
        plan,
      };
    }
    case "ethereum": {
      const p = plan as toPolkadot.SendValidationResult;
      for (const error of p.failure?.errors ?? []) {
        switch (error.code) {
          case toPolkadot.SendValidationCode.BeneficiaryAccountMissing: {
            if (data.destination.id === "assethub") {
              steps.push({
                kind: TransferStepKind.SubstrateTransferED,
                displayOrder: 11,
              });
            } else {
              errors.push(error);
            }
            break;
          }
          case toPolkadot.SendValidationCode.ERC20SpendNotApproved: {
            steps.push({
              kind: TransferStepKind.ApproveERC20,
              displayOrder: 30,
            });
            break;
          }
          case toPolkadot.SendValidationCode.InsufficientToken: {
            if (data.tokenMetadata.symbol.toLowerCase() === "weth") {
              steps.push({
                kind: TransferStepKind.DepositWETH,
                displayOrder: 20,
              });
            } else {
              errors.push(error);
            }
            break;
          }
          default:
            errors.push(error);
            break;
        }
      }
      steps.sort((a, b) => a.displayOrder - b.displayOrder);
      return {
        steps,
        errors,
        plan,
      };
    }
    default:
      throw Error(`Invalid form state: cannot infer source type.`);
  }
}
