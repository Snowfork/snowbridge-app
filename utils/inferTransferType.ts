import { TransferType } from "./types";
import { TransferLocation } from "@snowbridge/base-types";

export function inferTransferType(
  source: TransferLocation,
  destination: TransferLocation,
): TransferType {
  if (source.kind === "ethereum" && destination.kind === "polkadot") {
    // source ethereum and destination is substrate so its a standard transfer.
    return "toPolkadotV2";
  } else if (
    (source.kind === "polkadot" || source.kind === "ethereum") &&
    destination.kind === "ethereum"
  ) {
    // source can be evm substrate chain such as moonbeam or normal substrate chain.
    return "toEthereumV2";
  } else if (source.kind === "polkadot" && destination.kind === "polkadot") {
    // if source and destination is substrate than its an inter-parachain transfer.
    return "forInterParachain";
  } else {
    throw Error(
      `Could not infer transfer type for source:${source.kind} and destination:${destination.kind}.`,
    );
  }
}
