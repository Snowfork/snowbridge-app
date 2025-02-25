import { toEthereumV2, toPolkadotV2 } from "@snowbridge/api";
import {
  TransferPlanSteps,
  TransferStep,
  TransferStepKind,
  ValidationData,
  ValidationResult,
} from "./types";

function isAssetHubLike(id: string) {
  return id === "asset-hub-paseo" || id === "statemint" || id === "westmint";
}

export function createStepsFromPlan(
  data: ValidationData,
  plan: ValidationResult,
): TransferPlanSteps {
  const errors = [];
  const steps: TransferStep[] = [];

  switch (data.source.type) {
    case "substrate": {
      const p = plan as toEthereumV2.ValidationResult;
      for (const log of p.logs) {
        if (log.kind === toEthereumV2.ValidationKind.Warning) {
          console.warn("Plan validation warning: ", log.message);
          continue;
        }
        if (
          log.reason === toEthereumV2.ValidationReason.InsufficientDotFee &&
          isAssetHubLike(data.source.id)
        ) {
          steps.push({
            kind: TransferStepKind.SubstrateTransferFee,
            displayOrder: 10,
          });
        } else {
          errors.push(log);
        }
      }
      return {
        steps,
        errors,
        plan,
      };
    }
    case "ethereum": {
      const p = plan as toPolkadotV2.ValidationResult;
      for (const log of p.logs) {
        if (log.kind === toPolkadotV2.ValidationKind.Warning) {
          console.warn("Plan validation warning: ", log.message);
          continue;
        }
        switch (log.reason) {
          case toPolkadotV2.ValidationReason.AccountDoesNotExist: {
            if (isAssetHubLike(data.destination.id)) {
              steps.push({
                kind: TransferStepKind.SubstrateTransferED,
                displayOrder: 11,
              });
            } else {
              errors.push(log);
            }
            break;
          }
          case toPolkadotV2.ValidationReason.GatewaySpenderLimitReached: {
            steps.push({
              kind: TransferStepKind.ApproveERC20,
              displayOrder: 30,
            });
            break;
          }
          case toPolkadotV2.ValidationReason.InsufficientTokenBalance: {
            if (data.tokenMetadata.symbol.toLowerCase() === "weth") {
              steps.push({
                kind: TransferStepKind.DepositWETH,
                displayOrder: 20,
              });
            } else {
              errors.push(log);
            }
            break;
          }
          default:
            errors.push(log);
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
