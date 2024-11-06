import { FC } from "react";
import { ValidationData } from "@/utils/types";
import { etherscanAddressLink, subscanAccountLink } from "@/lib/explorerLinks";
import { BridgeStatus, getEnvironmentName } from "@/lib/snowbridge";
import { FeeDisplay } from "../FeeDisplay";
import { useBridgeStatus } from "@/hooks/useBridgeStatus";
import { formatTime } from "@/utils/formatting";

interface TransferSummaryProps {
  data: ValidationData;
}
function estimateDelivery(data: ValidationData, status: BridgeStatus | null) {
  if (!status) return "Calculating...";
  switch (data.source.type) {
    case "ethereum": {
      if ((status.statusInfo.toPolkadot as any).estimatedDeliveryTime) {
        return formatTime(
          (status.statusInfo.toPolkadot as any).estimatedDeliveryTime,
        );
      }
      const EPOCH_TIME = 6.4 * 60;
      let estimatedSeconds =
        EPOCH_TIME * 5 - status.statusInfo.toPolkadot.latencySeconds;
      if (estimatedSeconds < 0) {
        estimatedSeconds = EPOCH_TIME * 3 - estimatedSeconds;
      }
      return formatTime(estimatedSeconds);
    }
    case "substrate": {
      if ((status.statusInfo.toEthereum as any).estimatedDeliveryTime) {
        return formatTime(
          (status.statusInfo.toEthereum as any).estimatedDeliveryTime,
        );
      }
      const MAX_BEEFY_DELIVERY_TIME = 60 * 60 * 4.5;
      let estimatedSeconds =
        MAX_BEEFY_DELIVERY_TIME - status.statusInfo.toEthereum.latencySeconds;
      if (estimatedSeconds < 0) {
        estimatedSeconds = MAX_BEEFY_DELIVERY_TIME - estimatedSeconds;
      }
      return formatTime(estimatedSeconds);
    }
    default:
      return "Could not estimate.";
  }
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
            className="inline whitespace-pre font-mono underline cursor-pointer"
          >
            {data.formData.sourceAccount}
          </span>
        </p>
        <p className="text-sm hidden md:flex">
          Beneficiary:{" "}
          <span
            onClick={() => window.open(beneficiaryLink)}
            className="inline whitespace-pre font-mono underline cursor-pointer"
          >
            {data.formData.beneficiary}
          </span>
        </p>
        <p className="text-sm">
          Transfer Fee:{" "}
          <FeeDisplay
            className="inline whitespace-pre font-mono"
            source={data.source.type}
            destination={data.destination}
            token={data.formData.token}
            displayDecimals={8}
          />
        </p>
        <p className="text-sm">
          Estimated Delivery:{" "}
          <span className="inline whitespace-pre font-mono">
            {isRefreshing
              ? "Calculating..."
              : statusError
                ? "Could not estimate delivery"
                : estimateDelivery(data, status)}
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
