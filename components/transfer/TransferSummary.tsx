import { FC } from "react";
import { ValidationData } from "@/utils/types";
import { etherscanAddressLink, subscanAccountLink } from "@/lib/explorerLinks";
import { getEnvironmentName } from "@/lib/snowbridge";
import { FeeDisplay } from "../FeeDisplay";
import { useBridgeStatus } from "@/hooks/useBridgeStatus";
import { formatTime } from "@/utils/formatting";
import { estimateDelivery } from "@/lib/bridgeStatus";

interface TransferSummaryProps {
  data: ValidationData;
}

export const TransferSummary: FC<TransferSummaryProps> = ({ data }) => {
  const {
    data: status,
    isLoading: isStatusLoading,
    isValidating: isStatusValidating,
    error: statusError,
  } = useBridgeStatus();

  const isRefreshing = isStatusLoading || isStatusValidating;

  const envName = getEnvironmentName();
  let sourceAccountLink: string;
  let beneficiaryLink: string;
  if (data.source.id === "ethereum") {
    sourceAccountLink = etherscanAddressLink(
      envName,
      data.formData.sourceAccount,
    );
    beneficiaryLink = subscanAccountLink(
      envName,
      "ah",
      data.formData.beneficiary,
    );
  } else {
    sourceAccountLink = subscanAccountLink(
      envName,
      "ah",
      data.formData.sourceAccount,
    );
    beneficiaryLink = etherscanAddressLink(envName, data.formData.beneficiary);
  }

  return (
    <div className="flex flex-col">
      <p className="text-l my-2 font-semibold">
        Send {data.formData.amount} {data.tokenMetadata.symbol} from{" "}
        {data.source.name} to {data.destination.name}
      </p>
      <div className="flex flex-col m-5 gap-2">
        <p className="text-sm hidden md:flex">
          Source Account:{" "}
          <span
            onClick={() => window.open(sourceAccountLink)}
            className="inline whitespace-pre font-mono hover:underline cursor-pointer pl-2"
          >
            {data.formData.sourceAccount}
          </span>
        </p>
        <p className="text-sm hidden md:flex">
          Beneficiary:{" "}
          <span
            onClick={() => window.open(beneficiaryLink)}
            className="inline whitespace-pre font-mono hover:underline cursor-pointer pl-2"
          >
            {data.formData.beneficiary}
          </span>
        </p>
        <div className="text-sm">
          Transfer Fee:{" "}
          <FeeDisplay
            className="inline whitespace-pre font-mono pl-2"
            source={data.source.type}
            destination={data.destination}
            token={data.formData.token}
            displayDecimals={8}
          />
        </div>
        <p className="text-sm">
          Estimated Delivery:{" "}
          <span className="inline whitespace-pre font-mono pl-2">
            {isRefreshing
              ? "Calculating..."
              : statusError
                ? "Could not estimate delivery"
                : estimateDelivery(data.source.type, status)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            (up to{" "}
            {data.source.type === "ethereum"
              ? "25 minutes"
              : "4 hour 30 minutes"}
            )
          </span>
        </p>
      </div>
    </div>
  );
};
