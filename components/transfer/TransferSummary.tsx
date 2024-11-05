import { FC } from "react";
import { ValidationData } from "@/utils/types";
import { etherscanAddressLink, subscanAccountLink } from "@/lib/explorerLinks";
import { getEnvironmentName } from "@/lib/snowbridge";

interface TransferSummaryProps {
  data: ValidationData;
}
export const TransferSummary: FC<TransferSummaryProps> = ({ data }) => {
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
      <p className="text-l my-4 font-semibold">
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
          Fee: <span className="inline whitespace-pre font-mono">2 DOT</span>
        </p>
        <p className="text-sm">
          Estimated Delivery:{" "}
          <span className="inline whitespace-pre font-mono">
            3 hour 2 minutes
          </span>
        </p>
      </div>
    </div>
  );
};
