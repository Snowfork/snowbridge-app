import { FC } from "react";
import { ValidationData } from "@/utils/types";
import { etherscanAddressLink, subscanAccountLink } from "@/lib/explorerLinks";
import { getEnvironmentName } from "@/lib/snowbridge";
import { FeeDisplay } from "../FeeDisplay";
import { useBridgeStatus } from "@/hooks/useBridgeStatus";
import { estimateDelivery } from "@/lib/bridgeStatus";
import { Table, TableBody, TableRow, TableCell } from "../ui/table";

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
      <p className="text-l my-2 font-semibold font-highlight">
        Send {data.formData.amount} {data.tokenMetadata.symbol} from{" "}
        {data.source.name} to {data.destination.name}
      </p>
      <div className="flex flex-col">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-bold">From</TableCell>
              <TableCell>{data.formData.sourceAccount}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">To</TableCell>
              <TableCell>
                <span
                  onClick={() => window.open(beneficiaryLink)}
                  className="hover:underline cursor-pointer"
                >
                  {data.formData.beneficiary}
                </span>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Transfer Fee</TableCell>
              <TableCell>
                {" "}
                <FeeDisplay
                  className="inline"
                  source={data.source}
                  destination={data.destination}
                  token={data.formData.token}
                  displayDecimals={8}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Estimated Delivery</TableCell>
              <TableCell>
                {" "}
                <span className="">
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
                    : "1 hour 30 minutes"}
                  )
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
