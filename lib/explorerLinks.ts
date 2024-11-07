export const EXPLORERS: { [env: string]: { [explorer: string]: string } } = {
  local_e2e: {
    etherscan: "https://no-expolorers-for-local-e2e/",
    subscan_ah: "https://no-expolorers-for-local-e2e/",
    subscan_bh: "https://no-expolorers-for-local-e2e/",
    subscan_relaychain: "https://no-expolorers-for-local-e2e/",
    polkadot_js_kilt: "https://no-expolorers-for-westend/",
  },
  paseo_sepolia: {
    etherscan: "https://sepolia.etherscan.io/",
    subscan_ah: "https://assethub-paseo.subscan.io/",
    subscan_bh: "https://bridgehub-paseo.subscan.io/",
    subscan_relaychain: "https://paseo.subscan.io/",
    polkadot_js_kilt:
      "https://polkadot.js.org/apps/?rpc=wss://peregrine.kilt.io/parachain-public-ws/",
  },
  polkadot_mainnet: {
    etherscan: "https://etherscan.io/",
    subscan_ah: "https://assethub-polkadot.subscan.io/",
    subscan_bh: "https://bridgehub-polkadot.subscan.io/",
    subscan_relaychain: "https://polkadot.subscan.io/",
    subscan_kilt: "https://spiritnet.subscan.io/",
  },
  westend_sepolia: {
    etherscan: "https://sepolia.etherscan.io/",
    subscan_ah: "https://assethub-westend.subscan.io/",
    subscan_bh: "https://bridgehub-westend.subscan.io/",
    subscan_relaychain: "https://westend.subscan.io/",
    polkadot_js_kilt: "https://no-expolorers-for-westend/",
  },
};

export const etherscanTxHashLink = (
  envName: string,
  txHash: string,
): string => {
  const baseUrl = EXPLORERS[envName]["etherscan"];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}tx/${txHash}`;
};

export const etherscanAddressLink = (
  envName: string,
  address: string,
): string => {
  const baseUrl = EXPLORERS[envName]["etherscan"];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}address/${address}`;
};

export const etherscanERC20TokenLink = (
  envName: string,
  tokenAddress: string,
): string => {
  const baseUrl = EXPLORERS[envName]["etherscan"];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}token/${tokenAddress}`;
};

export const subscanExtrinsicLink = (
  envName: string,
  para: "ah" | "bh" | "relaychain",
  extrinsicIndex: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}extrinsic/${extrinsicIndex}`;
};

export const subscanEventLink = (
  envName: string,
  para: "ah" | "bh",
  eventIndex: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  const block = eventIndex.split("-")[0];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}block/${block}?event=${eventIndex}&tab=event`;
};

export const subscanAccountLink = (
  envName: string,
  para: "ah" | "bh",
  address: string,
): string => {
  const baseUrl = EXPLORERS[envName][`subscan_${para}`];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}account/${address}`;
};
