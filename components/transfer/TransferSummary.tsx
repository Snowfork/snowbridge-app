import { FC } from "react";
import { ValidationData } from "@/utils/types";
import { etherscanAddressLink, subscanAccountLink } from "@/lib/explorerLinks";
import { FeeDisplay } from "../FeeDisplay";
import {
  estimateDelivery,
  useEstimatedDelivery,
} from "@/hooks/useEstimatedDelivery";
import { Table, TableBody, TableRow, TableCell } from "../ui/table";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

interface TransferSummaryProps {
  data: ValidationData;
}

export const TransferSummary: FC<TransferSummaryProps> = ({ data }) => {
  const { data: deliveryLatency, error: latencyError } = useEstimatedDelivery();
  let sourceAccountDisplay = data.formData.sourceAccount;
  let beneficiaryDisplay = data.formData.beneficiary;
  let sourceAccountLink: string;
  let beneficiaryLink: string;
  if (data.source.id === "ethereum") {
    if (data.destination.parachain?.info.accountType === "AccountId32") {
      beneficiaryDisplay = encodeAddress(
        decodeAddress(beneficiaryDisplay),
        data.destination.parachain?.info.ss58Format ??
          data.assetRegistry.relaychain.ss58Format,
      );
    }
    sourceAccountLink = etherscanAddressLink(
      data.assetRegistry.environment,
      data.assetRegistry.ethChainId,
      sourceAccountDisplay,
    );
    beneficiaryLink = subscanAccountLink(
      data.assetRegistry.environment,
      data.destination.parachain!.parachainId,
      beneficiaryDisplay,
    );
  } else {
    if (data.source.parachain?.info.accountType === "AccountId32") {
      sourceAccountDisplay = encodeAddress(
        decodeAddress(sourceAccountDisplay),
        data.source.parachain?.info.ss58Format ??
          data.assetRegistry.relaychain.ss58Format,
      );
    }
    sourceAccountLink = subscanAccountLink(
      data.assetRegistry.environment,
      data.source.parachain!.parachainId,
      sourceAccountDisplay,
    );
    beneficiaryLink = etherscanAddressLink(
      data.assetRegistry.environment,
      data.assetRegistry.ethChainId,
      data.formData.beneficiary,
    );
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
              <TableCell>
                <span
                  onClick={() => window.open(sourceAccountLink)}
                  className="hover:underline cursor-pointer"
                >
                  {data.formData.sourceAccount}
                </span>
              </TableCell>
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
              <TableCell className="font-bold">Transfer Amount</TableCell>
              <TableCell>
                {data.formData.amount} {data.tokenMetadata.symbol}
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
                  {deliveryLatency === null
                    ? "Calculating..."
                    : latencyError
                      ? "Could not estimate delivery"
                      : estimateDelivery(data.source.type, deliveryLatency)}
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
