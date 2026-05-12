import { BridgeInfo } from "@snowbridge/base-types";
import { bridgeInfoFor } from "@snowbridge/registry";
import { addKusamaRoutes } from "./kusamaRoutes";

export function bridgeInfoWithKusamaRoutes(envName: string): BridgeInfo {
  // TODO: Remove this helper once the Snowbridge registry is rebuilt with
  // Kusama Asset Hub routes included.
  return addKusamaRoutes(bridgeInfoFor(envName));
}
