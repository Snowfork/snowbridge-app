import { TransferType } from "./types";
import { TransferLocation } from "@snowbridge/base-types";

export function inferTransferType(
  source: TransferLocation,
  destination: TransferLocation,
): TransferType {
  if (source.type === "ethereum" && destination.type === "substrate") {
    // source ethereum and destination is substrate so its a standard transfer.
    return "toPolkadotV2";
  } else if (
    (source.type === "substrate" || source.type === "ethereum") &&
    destination.type === "ethereum"
  ) {
    // source can be evm substrate chain such as moonbeam or normal substrate chain.
    return "toEthereumV2";
  } else if (source.type === "substrate" && destination.type === "substrate") {
    // if source and destination is substrate than its an inter-parachain transfer.
    return "forInterParachain";
  } else {
    throw Error(
      `Could not infer transfer type for source:${source.type} and destination:${destination.type}.`,
    );
  }
}
