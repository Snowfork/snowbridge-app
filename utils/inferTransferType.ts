import { Transfer } from "@/store/transferActivity";
import { TransferType } from "./types";
import { TransferLocation } from "@snowbridge/base-types";

export function inferKindFromTransfer(transfer: Transfer): TransferType {
  const { sourceKind: source, destinationKind: destination } = transfer;
  if (source === "kusama" && destination === "polkadot") {
    return `${source}->${destination}`;
  } else if (source === "polkadot" && destination === "kusama") {
    return `${source}->${destination}`;
  } else if (source === "polkadot" && destination === "ethereum") {
    return `${source}->${destination}`;
  } else if (source === "polkadot" && destination === "ethereum_l2") {
    return `${source}->${destination}`;
  } else if (source === "polkadot" && destination === "polkadot") {
    return `${source}->${destination}`;
  } else if (source === "ethereum" && destination === "polkadot") {
    return `${source}->${destination}`;
  } else if (source === "ethereum_l2" && destination === "polkadot") {
    return `${source}->${destination}`;
  } else if (source === "ethereum" && destination === "ethereum") {
    // This should never be the case, even though eth to eth transfers are supported between
    // moonbeam and ethereum, the indexer picks up moonbeam as a polkadot chain
    throw Error(`Unexpected ${source}->${destination}.`);
  } else {
    throw Error(
      `Could not infer transfer type for source:${source} and destination:${destination}.`,
    );
  }
}

// TODO: Delete
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
  } else if (source.kind === "ethereum_l2" && destination.kind === "polkadot") {
    return `${source.kind}->${destination.kind}`;
  } else {
    throw Error(
      `Could not infer transfer type for source:${source.kind} and destination:${destination.kind}.`,
    );
  }
}
