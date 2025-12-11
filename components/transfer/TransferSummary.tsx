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
import { formatBalance } from "@/utils/formatting";
import { inferTransferType } from "@/utils/inferTransferType";
import Image from "next/image";

interface TransferSummaryProps {
  data: ValidationData;
  executionFee: bigint | null;
}

export const TransferSummary: FC<TransferSummaryProps> = ({
  data,
  executionFee,
}) => {
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

  let sourceTokenSymbol: string | null = null;
  let sourceTokenDecimals: number | null = null;
  switch (data.source.type) {
    case "ethereum":
      sourceTokenSymbol = "ETH";
      sourceTokenDecimals = 18;
      break;
    case "substrate":
      sourceTokenSymbol = data.source.parachain?.info.tokenSymbols ?? null;
      sourceTokenDecimals = data.source.parachain?.info.tokenDecimals ?? null;
      break;
  }
  const transferType = inferTransferType(data.source, data.destination);
  return (
    <div className="flex flex-col">
      <p className="text-l my-2 glass-pill p-2 flex items-center justify-center gap-1 flex-wrap">
        Send {data.formData.amount} {data.tokenMetadata.symbol} from{" "}
        <Image
          src={`/images/${data.source.id.toLowerCase()}.png`}
          width={20}
          height={20}
          alt={data.source.name}
          className="inline-block rounded-full"
        />
        {data.source.name} to{" "}
        <Image
          src={`/images/${data.destination.id.toLowerCase()}.png`}
          width={20}
          height={20}
          alt={data.destination.name}
          className="inline-block rounded-full"
        />
        {data.destination.name}
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
            <TableRow
              hidden={
                !(
                  data.tokenMetadata.symbol === data.fee.symbol &&
                  data.fee.symbol === sourceTokenSymbol
                )
              }
            >
              <TableCell className="font-bold">Total Amount</TableCell>
              <TableCell>
                {formatBalance({
                  number:
                    data.amountInSmallestUnit +
                    data.fee.fee +
                    (executionFee ?? 0n),
                  decimals: data.tokenMetadata.decimals,
                })}{" "}
                {data.tokenMetadata.symbol}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Transfer Amount</TableCell>
              <TableCell>
                {data.formData.amount} {data.tokenMetadata.symbol}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Execution Fee</TableCell>
              <TableCell>
                {executionFee && sourceTokenSymbol && sourceTokenDecimals
                  ? formatBalance({
                      number: executionFee,
                      decimals: sourceTokenDecimals,
                    }) + ` ${sourceTokenSymbol}`
                  : "Calculating..."}{" "}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Delivery Fee</TableCell>
              <TableCell>
                {formatBalance({
                  number: data.fee.fee,
                  decimals: data.fee.decimals,
                })}{" "}
                {data.fee.symbol}
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
                      : estimateDelivery(
                          data.source,
                          data.destination,
                          deliveryLatency,
                        )}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  (up to{" "}
                  {transferType === "toPolkadotV2"
                    ? "25 minutes"
                    : transferType === "toEthereumV2"
                      ? "1 hour 30 minutes"
                      : transferType === "forInterParachain"
                        ? "5 minutes"
                        : "unknown upper bound"}
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
