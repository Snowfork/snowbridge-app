import { forInterParachain, toEthereumV2, toPolkadotV2 } from "@snowbridge/api";
import {
  NEURO_WEB_PARACHAIN,
  TransferPlanSteps,
  TransferStep,
  TransferStepKind,
  ValidationData,
  ValidationResult,
} from "./types";

function isAssetHubLike(specName?: string) {
  return (
    specName === "asset-hub-paseo" ||
    specName === "statemint" ||
    specName === "westmint"
  );
}

export function createStepsFromPlan(
  data: ValidationData,
  plan: ValidationResult,
): TransferPlanSteps {
  const errors = [];
  const steps: TransferStep[] = [];

  let dryRunFailedLog:
    | toEthereumV2.ValidationLog
    | toPolkadotV2.ValidationLog
    | forInterParachain.ValidationLog
    | null = null;

  switch (plan.kind) {
    case "polkadot->ethereum_l2":
    case "polkadot->ethereum":
    case "ethereum->ethereum": {
      for (const log of plan.logs) {
        if (
          log.kind === toEthereumV2.ValidationKind.Error &&
          log.reason === toEthereumV2.ValidationReason.DryRunFailed
        ) {
          dryRunFailedLog = log;
          continue;
        }
        if (
          log.kind === toEthereumV2.ValidationKind.Error &&
          log.reason ===
            toEthereumV2.ValidationReason.ContractCallAgentNotRegistered
        ) {
          steps.push({
            kind: TransferStepKind.CreateAgent,
            displayOrder: 10,
          });
          continue;
        }
        if (log.kind === toEthereumV2.ValidationKind.Warning) {
          console.warn("Plan validation warning: ", log.message);
          continue;
        }
        if (
          log.reason === toEthereumV2.ValidationReason.InsufficientDotFee &&
          isAssetHubLike(data.source.parachain?.info.specName)
        ) {
          steps.push({
            kind: TransferStepKind.SubstrateTransferFee,
            displayOrder: 10,
          });
          continue;
        }
        if (
          log.reason ===
            toEthereumV2.ValidationReason.InsufficientTokenBalance &&
          plan.transfer.computed.sourceParaId === NEURO_WEB_PARACHAIN // NeureWeb
        ) {
          steps.push({
            kind: TransferStepKind.WrapNeuroWeb,
            displayOrder: 10,
          });
          continue;
        }
        errors.push(log);
      }
      if (
        errors.length === 0 &&
        steps.length == 0 &&
        dryRunFailedLog !== null
      ) {
        errors.push(dryRunFailedLog);
      }
      steps.sort((a, b) => a.displayOrder - b.displayOrder);
      return {
        steps,
        errors,
        plan,
      };
    }
    case "ethereum_l2->polkadot":
    case "ethereum->polkadot": {
      if (data.destination.kind !== "polkadot") throw Error(`Invalid state`);
      for (const log of plan.logs) {
        if (
          log.kind === toPolkadotV2.ValidationKind.Error &&
          log.reason === toPolkadotV2.ValidationReason.DryRunFailed
        ) {
          dryRunFailedLog = log;
          continue;
        }
        if (log.kind === toPolkadotV2.ValidationKind.Warning) {
          console.warn("Plan validation warning: ", log.message);
          continue;
        }
        switch (log.reason) {
          case toPolkadotV2.ValidationReason.AccountDoesNotExist: {
            if (isAssetHubLike(data.destination.parachain.info.specName)) {
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
      // If there are no other logs but dry run failed then display dry run failed to the user.
      // Else expect that the dry run failed because of the other error logs.
      if (
        errors.length === 0 &&
        steps.length === 0 &&
        dryRunFailedLog !== null
      ) {
        errors.push(dryRunFailedLog);
      }
      steps.sort((a, b) => a.displayOrder - b.displayOrder);
      return {
        steps,
        errors,
        plan,
      };
    }
    case "polkadot->polkadot": {
      const p = plan as forInterParachain.ValidationResult;
      for (const log of p.logs) {
        if (log.kind === toPolkadotV2.ValidationKind.Warning) {
          console.warn("Plan validation warning: ", log.message);
          continue;
        }
        errors.push(log);
      }
      return {
        steps,
        errors,
        plan,
      };
    }
    default:
      throw Error(`Cannot infer source type ${plan.kind}.`);
  }
}
