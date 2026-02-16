import { ETHER_TOKEN_ADDRESS } from "@snowbridge/api/dist/assets_v2";
import { ChainKey, ParachainKind } from "@snowbridge/base-types";

const EXPLORERS: { [env: string]: { [explorer: string]: string } } = {
  local_e2e: {},
  paseo_sepolia: {
    etherscan_11155111: "https://sepolia.etherscan.io/",
    etherscan_84532: "https://sepolia.basescan.org/",
    etherscan_421614: "https://sepolia.arbiscan.io/",
    etherscan_11155420: "https://sepolia-optimism.etherscan.io/",
    subscan_polkadot_1000: "https://assethub-paseo.subscan.io/",
    subscan_polkadot_1002: "https://bridgehub-paseo.subscan.io/",
    subscan_polkadot_2043: "https://neuroweb-testnet.subscan.io/",
    subscan_relaychain: "https://paseo.subscan.io/",
    polkadot_js_2086:
      "https://polkadot.js.org/apps/?rpc=wss://peregrine.kilt.io/parachain-public-ws/",
  },
  polkadot_mainnet: {
    etherscan_1: "https://etherscan.io/",
    etherscan_8453: "https://basescan.org/",
    etherscan_42161: "https://arbiscan.io/",
    etherscan_10: "https://optimistic.etherscan.io/",
    uniswap_1: "https://app.uniswap.org/",
    stellaswap_2004: "https://app.stellaswap.com/exchange/swap",
    dapp_polkadot_2034: "https://app.hydration.net/",
    dapp_polkadot_2004: "https://apps.moonbeam.network/moonbeam",
    dapp_polkadot_2030: "https://app.bifrost.io/",
    subscan_polkadot_1000: "https://assethub-polkadot.subscan.io/",
    subscan_polkadot_1002: "https://bridgehub-polkadot.subscan.io/",
    subscan_polkadot_2034: "https://hydration.subscan.io/",
    subscan_polkadot_2004: "https://moonbeam.subscan.io/",
    subscan_polkadot_2030: "https://bifrost.subscan.io/",
    subscan_polkadot_3369: "https://mythos.subscan.io/",
    subscan_polkadot_2043: "https://neuroweb.subscan.io/",
    subscan_polkadot_2086: "https://spiritnet.subscan.io/",
    subscan_relaychain: "https://polkadot.subscan.io/",
    subscan_kusama_1000: "https://assethub-kusama.subscan.io/",
  },
  westend_sepolia: {
    etherscan_11155111: "https://sepolia.etherscan.io/",
    etherscan_84532: "https://sepolia.basescan.org/",
    etherscan_421614: "https://sepolia.arbiscan.io/",
    etherscan_11155420: "https://sepolia-optimism.etherscan.io/",
    subscan_polkadot_1000: "https://assethub-westend.subscan.io/",
    subscan_polkadot_1002: "https://bridgehub-westend.subscan.io/",
    subscan_relaychain: "https://westend.subscan.io/",
  },
};

export const etherscanTxHashLink = (
  envName: string,
  chainId: number,
  txHash: string,
): string => {
  const baseUrl = EXPLORERS[envName][`etherscan_${chainId}`];
  if (!baseUrl) {
    return `#no-explorer-url-for-token-${chainId}`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}tx/${txHash}`;
};

export const etherscanAddressLink = (
  envName: string,
  chainId: number,
  address: string,
): string => {
  const baseUrl = EXPLORERS[envName][`etherscan_${chainId}`];
  if (!baseUrl) {
    return `#no-explorer-url-for-token-${chainId}`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}address/${address}`;
};

export const etherscanERC20TokenLink = (
  envName: string,
  chainId: number,
  tokenAddress: string,
): string => {
  const baseUrl = EXPLORERS[envName][`etherscan_${chainId}`];
  if (!baseUrl) {
    return `#no-explorer-url-for-token-${tokenAddress}`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}token/${tokenAddress}`;
};

export const subscanExtrinsicLink = (
  envName: string,
  para: ChainKey<ParachainKind> | "relaychain",
  extrinsicIndex: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  if (!baseUrl) {
    return `#no-explorer-url-for-extrinsic-${para}`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}extrinsic/${extrinsicIndex}`;
};

export const subscanEventLink = (
  envName: string,
  para: ChainKey<ParachainKind> | "relaychain",
  eventIndex: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  if (!baseUrl) {
    return `#no-explorer-url-for-event-${para}`;
  }
  const block = eventIndex.split("-")[0];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}block/${block}?event=${eventIndex}&tab=event`;
};

export const subscanAccountLink = (
  envName: string,
  para: ChainKey<ParachainKind> | "relaychain",
  address: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  if (!baseUrl) {
    return `#no-explorer-url-for-account-${para}`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}account/${address}`;
};

export const uniswapTokenLink = (
  envName: string,
  chainId: number,
  token: string,
) => {
  const baseUrl = EXPLORERS[envName][`uniswap_${chainId}`];
  if (!baseUrl) {
    return `#no-uniswap-url-for-token-${token}`;
  }
  if (token === ETHER_TOKEN_ADDRESS) token = "NATIVE";
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}explore/tokens/ethereum/${token}`;
};

export const stellasSwapTokenLink = (
  envName: string,
  chainId: number,
  token: string,
) => {
  const baseUrl = EXPLORERS[envName][`stellaswap_${chainId}`];
  if (!baseUrl) {
    return `#no-stellaswap-url-for-token-${chainId}`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}`;
};

export const getDappLink = (envName: string, paraId: number) => {
  const baseUrl = EXPLORERS[envName][`dapp_${paraId}`];
  if (!baseUrl) {
    return `#no-dapp-url-for-para-${paraId}`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}`;
};
