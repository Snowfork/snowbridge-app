"use client";
import { environment, toPolkadot } from "@snowbridge/api";
import { FC } from "react";
import { ErrorDialog } from "./ErrorDialog";
import { Button } from "./ui/button";
import { getDestinationTokenIdByAddress } from "../utils/getDestinationTokenIdByAddress";
import { userFriendlyErrorMessage } from "../utils/userFriendlyErrorMessage";
import {
  ErrorInfo,
  FormData,
  FormDataSwitch,
  ValidationError,
} from "@/utils/types";

export const SendErrorDialog: FC<{
  info: ErrorInfo | null;
  formData: FormData;
  destination?: environment.TransferLocation;
  onDepositAndApproveWeth?: () => Promise<void>;
  onApproveSpend?: () => Promise<void>;
  dismiss: () => void;
}> = ({
  info,
  formData,
  destination,
  dismiss,
  onDepositAndApproveWeth,
  onApproveSpend,
}) => {
  const token = getDestinationTokenIdByAddress({
    tokenAddress: formData.token,
    destination,
  });
  let errors = info?.errors ?? [];
  const insufficentAsset = errors.find(
    (error) =>
      error.kind === "toPolkadot" &&
      error.code === toPolkadot.SendValidationCode.InsufficientToken,
  );
  errors = errors.filter(
    (error) =>
      !(
        error.kind === "toPolkadot" &&
        error.code === toPolkadot.SendValidationCode.ERC20SpendNotApproved &&
        insufficentAsset !== undefined
      ),
  );

  const fixAction = (error: ValidationError): JSX.Element => {
    if (
      error.kind === "toPolkadot" &&
      error.code === toPolkadot.SendValidationCode.InsufficientToken &&
      token === "WETH"
    ) {
      return (
        <Button className="py-1" size="sm" onClick={onDepositAndApproveWeth}>
          Deposit WETH and Approve Spend
        </Button>
      );
    }
    if (
      error.kind === "toPolkadot" &&
      error.code === toPolkadot.SendValidationCode.ERC20SpendNotApproved
    ) {
      return (
        <Button className="py-1" size="sm" onClick={onApproveSpend}>
          Approve WETH Spend
        </Button>
      );
    }
    if (
      error.code === toPolkadot.SendValidationCode.BeneficiaryAccountMissing
    ) {
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
