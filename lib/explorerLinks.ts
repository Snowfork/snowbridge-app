export const EXPLORERS: { [env: string]: { [explorer: string]: string } } = {
  local_e2e: {},
  paseo_sepolia: {
    etherscan_11155111: "https://sepolia.etherscan.io/",
    subscan_1000: "https://assethub-paseo.subscan.io/",
    subscan_2000: "https://bridgehub-paseo.subscan.io/",
    subscan_relaychain: "https://paseo.subscan.io/",
    polkadot_js_2086:
      "https://polkadot.js.org/apps/?rpc=wss://peregrine.kilt.io/parachain-public-ws/",
  },
  polkadot_mainnet: {
    etherscan_1: "https://etherscan.io/",
    subscan_1000: "https://assethub-polkadot.subscan.io/",
    subscan_1002: "https://bridgehub-polkadot.subscan.io/",
    subscan_2034: "https://hydration.subscan.io/",
    subscan_2004: "https://moonbeam.subscan.io/",
    subscan_2030: "https://bifrost.subscan.io/",
    subscan_3369: "https://mythos.subscan.io/",
    subscan_relaychain: "https://polkadot.subscan.io/",
    subscan_2086: "https://spiritnet.subscan.io/",
  },
  westend_sepolia: {
    etherscan_11155111: "https://sepolia.etherscan.io/",
    subscan_1000: "https://assethub-westend.subscan.io/",
    subscan_1002: "https://bridgehub-westend.subscan.io/",
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
    return `#no-url-explorer-url-for-token-${chainId}"`;
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
    return `#no-url-explorer-url-for-token-${chainId}"`;
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
    return `#no-url-explorer-url-for-token-${tokenAddress}"`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}token/${tokenAddress}`;
};

export const subscanExtrinsicLink = (
  envName: string,
  para: number | "relaychain",
  extrinsicIndex: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  if (!baseUrl) {
    return `#no-url-explorer-url-for-extrinsic-${para}"`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}extrinsic/${extrinsicIndex}`;
};

export const subscanEventLink = (
  envName: string,
  para: number,
  eventIndex: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  if (!baseUrl) {
    return `#no-url-explorer-url-for-event-${para}"`;
  }
  const block = eventIndex.split("-")[0];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}block/${block}?event=${eventIndex}&tab=event`;
};

export const subscanAccountLink = (
  envName: string,
  para: number,
  address: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  if (!baseUrl) {
    return `#no-url-explorer-url-for-account-${para}"`;
  }
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}account/${address}`;
};
