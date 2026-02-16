import { Transfer } from "@/store/transferActivity";
import { TransferType } from "./types";
import { AssetRegistry, TransferLocation } from "@snowbridge/base-types";
import { getTransferLocation } from "@snowbridge/registry";

type TransferDetail = {
  source: TransferLocation;
  destination: TransferLocation;
  kind: TransferType;
};
export function inferTransferDetails(
  transfer: Transfer,
  registry: AssetRegistry,
): TransferDetail {
  let { sourceKind, sourceId, destinationKind, destinationId } = transfer;
  if (!sourceKind && sourceId) {
    if (`polkadot_${sourceId}` in registry.parachains) sourceKind = "polkadot";
    if (`ethereum_${sourceId}` in registry.ethereumChains)
      sourceKind = "ethereum";
    if (`ethereum_l2_${sourceId}` in registry.ethereumChains)
      sourceKind = "ethereum_l2";
  }
  if (!destinationKind && destinationId) {
    if (`polkadot_${destinationId}` in registry.parachains)
      destinationKind = "polkadot";
    if (`ethereum_${destinationId}` in registry.ethereumChains)
      destinationKind = "ethereum";
    if (`ethereum_l2_${destinationId}` in registry.ethereumChains)
      destinationKind = "ethereum_l2";
  }

  if (!destinationKind) {
    if (sourceKind === "ethereum" || sourceKind === "ethereum_l2") {
      destinationKind = "polkadot";
    }
    if (sourceKind === "polkadot") {
      destinationKind = "ethereum";
    }
    if (sourceKind === "kusama") {
      destinationKind = "polkadot";
    }
  }
  if (sourceKind === "ethereum" && !sourceId) {
    sourceId = registry.ethChainId;
  }
  if (destinationKind === "ethereum" && !destinationId) {
    destinationId = registry.ethChainId;
  }
  if (!sourceKind || !sourceId) {
    throw Error(
      `Could not infer source ${sourceKind} ${sourceId} from transfer ${transfer.sourceKind} ${transfer.sourceId} id: ${transfer.id}`,
    );
  }
  if (!destinationKind || !destinationId) {
    throw Error(
      `Could not infer destination ${destinationKind} ${destinationId} from transfer ${transfer.destinationKind} ${transfer.destinationId} id: ${transfer.id}`,
    );
  }
  const source = getTransferLocation(registry, {
    kind: sourceKind,
    id: sourceId,
  });
  const destination = getTransferLocation(registry, {
    kind: destinationKind,
    id: destinationId,
  });

  return { source, destination, kind: inferTransferType(source, destination) };
}

export function inferTransferType(
  source: TransferLocation,
  destination: TransferLocation,
): TransferType {
  if (source.kind === "ethereum" && destination.kind === "polkadot") {
    return `${source.kind}->${destination.kind}`;
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
  } else if (source.kind === "kusama" && destination.kind === "polkadot") {
    return `${source.kind}->${destination.kind}`;
  } else if (source.kind === "polkadot" && destination.kind === "kusama") {
    return `${source.kind}->${destination.kind}`;
  } else {
    throw Error(
      `Could not infer transfer type for source:${source.kind} and destination:${destination.kind}.`,
    );
  }
}
