import { BridgeInfo, TransferRoute } from "@snowbridge/base-types";

function kusamaRouteAssets(info: BridgeInfo): string[] {
  const { registry } = info;
  const polkadotAssetHub =
    registry.parachains[`polkadot_${registry.assetHubParaId}`];
  const kusamaAssetHub =
    registry.kusama?.parachains[`kusama_${registry.kusama.assetHubParaId}`];

  if (!polkadotAssetHub || !kusamaAssetHub) {
    return [];
  }

  const kusamaAssets = new Set(Object.keys(kusamaAssetHub.assets));
  return Object.keys(polkadotAssetHub.assets).filter((asset) =>
    kusamaAssets.has(asset),
  );
}

function hasRoute(
  routes: readonly TransferRoute[],
  from: TransferRoute["from"],
  to: TransferRoute["to"],
) {
  return routes.some(
    (route) =>
      route.from.kind === from.kind &&
      route.from.id === from.id &&
      route.to.kind === to.kind &&
      route.to.id === to.id,
  );
}

export function addKusamaRoutes(info: BridgeInfo): BridgeInfo {
  const { registry } = info;

  if (!registry.kusama) {
    return info;
  }

  const polkadotAssetHub = {
    kind: "polkadot" as const,
    id: registry.assetHubParaId,
  };
  const kusamaAssetHub = {
    kind: "kusama" as const,
    id: registry.kusama.assetHubParaId,
  };
  const assets = kusamaRouteAssets(info);
  const routes: TransferRoute[] = [...info.routes];

  if (!hasRoute(routes, polkadotAssetHub, kusamaAssetHub)) {
    routes.push({
      from: polkadotAssetHub,
      to: kusamaAssetHub,
      assets,
    });
  }

  if (!hasRoute(routes, kusamaAssetHub, polkadotAssetHub)) {
    routes.push({
      from: kusamaAssetHub,
      to: polkadotAssetHub,
      assets,
    });
  }

  return { ...info, routes };
}
