import { TransferType } from "./types";
import { TransferLocation } from "@snowbridge/base-types";

export function inferTransferType(
  source: TransferLocation,
  destination: TransferLocation,
): TransferType {
  if (source.kind === "ethereum" && destination.kind === "polkadot") {
    return `${source.kind}->${destination.kind}`;
    // source ethereum and destination is substrate so its a standard transfer.
  } else if (source.kind === "polkadot" && destination.kind === "ethereum") {
    return `${source.kind}->${destination.kind}`;
  } else if (source.kind === "ethereum" && destination.kind === "ethereum") {
    return `${source.kind}->${destination.kind}`;
  } else if (source.kind === "polkadot" && destination.kind === "polkadot") {
    return `${source.kind}->${destination.kind}`;
  } else if (source.kind === "polkadot" && destination.kind === "ethereum_l2") {
    return `${source.kind}->${destination.kind}`;
  } else {
    throw Error(
      `Could not infer transfer type for source:${source.kind} and destination:${destination.kind}.`,
    );
  }
}
