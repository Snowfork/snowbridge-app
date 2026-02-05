"use client";
import { toPolkadotV2 } from "@snowbridge/api";
import { FC } from "react";
import { ErrorDialog } from "./ErrorDialog";
import { Button } from "./ui/button";
import { userFriendlyErrorMessage } from "../utils/userFriendlyErrorMessage";
import { ErrorInfo, ValidationError } from "@/utils/types";
import { TransferFormData } from "@/utils/formSchema";
import { AssetRegistry, TransferLocation } from "@snowbridge/base-types";

export const SendErrorDialog: FC<{
  info: ErrorInfo | null;
  formData: TransferFormData;
  registry: AssetRegistry;
  destination?: TransferLocation;
  onDepositAndApproveWeth?: () => Promise<void>;
  onApproveSpend?: () => Promise<void>;
  dismiss: () => void;
}> = ({
  info,
  formData,
  destination,
  registry,
  dismiss,
  onDepositAndApproveWeth,
  onApproveSpend,
}) => {
  const token =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[
      formData.token
    ]?.symbol;

  let errors = info?.errors ?? [];
  const insufficentAsset = errors.find(
    (error) =>
      error.errorKind === "toPolkadotV2" &&
      error.reason === toPolkadotV2.ValidationReason.InsufficientTokenBalance,
  );
  errors = errors.filter(
    (error) =>
      !(
        error.errorKind === "toPolkadotV2" &&
        error.reason ===
          toPolkadotV2.ValidationReason.GatewaySpenderLimitReached &&
        insufficentAsset !== undefined
      ),
  );

  const fixAction = (error: ValidationError): JSX.Element => {
    if (
      error.errorKind === "toPolkadotV2" &&
      error.reason === toPolkadotV2.ValidationReason.InsufficientTokenBalance &&
      token === "WETH"
    ) {
      return (
        <Button className="py-1" size="sm" onClick={onDepositAndApproveWeth}>
          Deposit WETH and Approve Spend
        </Button>
      );
    }
    if (
      error.errorKind === "toPolkadotV2" &&
      error.reason === toPolkadotV2.ValidationReason.GatewaySpenderLimitReached
    ) {
      return (
        <Button className="py-1" size="sm" onClick={onApproveSpend}>
          Approve WETH Spend
        </Button>
      );
    }
    if (error.reason === toPolkadotV2.ValidationReason.AccountDoesNotExist) {
      return (
        <Button
          className="text-blue-600 py-1 h-auto"
          variant="link"
          onClick={() => {
            window.open(
              "https://support.polkadot.network/support/solutions/articles/65000181800-what-is-statemint-and-statemine-and-how-do-i-use-them-#Sufficient-and-non-sufficient-assets",
            );
          }}
        >
          Help
        </Button>
      );
    }
    return <></>;
  };
  let errorList = <></>;
  if (errors.length > 0) {
    errorList = (
      <ol className="flex-col list-inside list-disc">
        {errors.map((e, i) => (
          <li key={i} className="p-1">
            {userFriendlyErrorMessage({ error: e, formData })}
            {fixAction(e)}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ErrorDialog
      open={info !== null}
      dismiss={dismiss}
      title={info?.title ?? "Error"}
      description={info?.description ?? "Unknown Error"}
    >
      {errorList}
    </ErrorDialog>
  );
};
