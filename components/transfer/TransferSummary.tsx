import { FC } from "react";
import { Button } from "../ui/button";
import { LucideLoaderCircle } from "lucide-react";
import { ValidationData } from "@/utils/types";

interface TransferSummaryProps {
  data: ValidationData;
}
export const TransferSummary: FC<TransferSummaryProps> = ({ data }) => {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-l font-semibold">
        Send {data.formData.amount} {data.tokenMetadata.symbol} from{" "}
        {data.source.name} to {data.destination.name}
      </p>
      <p className="text-sm mx-5 hidden md:block">
        Source Account:{" "}
        <span className="inline whitespace-pre font-mono">
          {data.formData.sourceAccount}
        </span>
      </p>
      <p className="text-sm mx-5 hidden md:block">
        Beneficiary:{" "}
        <span className="inline whitespace-pre font-mono">
          {data.formData.beneficiary}
        </span>
      </p>
      <p className="text-sm mx-5">
        Fee: <span className="inline whitespace-pre font-mono">2 DOT</span>
      </p>
      <p className="text-sm mx-5">
        Estimated Delivery:{" "}
        <span className="inline whitespace-pre font-mono">
          3 hour 2 minutes
        </span>
      </p>
    </div>
  );
};
