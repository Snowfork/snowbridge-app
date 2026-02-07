import { ChainKey, ChainKind, TransferLocation } from "@snowbridge/base-types";

const chainNames: Record<ChainKey<ChainKind>, string> = {
  polkadot_1000: "Polkadot Hub",
  kusama_1000: "Kusama Hub",
  ethereum_1: "Ethereum",
  ethereum_11155111: "Sepolia",
  ethereum_l2_8453: "Base",
  ethereum_l2_84532: "Base (Sepolia)",
} as const;

export function chainName(location: TransferLocation): string {
  if (location.key in chainNames) return chainNames[location.key];
  switch (location.kind) {
    case "ethereum":
      if (location.parachain) {
        return `${location.parachain.info.name} (EVM)`;
      }
      return `Ethereum (${location.ethChain.name ?? "chainId: " + location.id})`;
    case "ethereum_l2":
      console.log("aaaaaa", location.id);
      return `Ethereum L2 (${location.ethChain.name ?? "chainId: " + location.id})`;
    case "polkadot":
    case "kusama":
      return location.parachain.info.name;
    default:
      throw Error(`Could not find name for: ${JSON.stringify(location)}`);
  }
}
