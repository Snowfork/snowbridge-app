"use client";

import { getEnvironment } from "@/lib/snowbridge";
import { metadata } from "@/lib/metadata";
import { createWeb3Modal, defaultConfig } from "@web3modal/ethers/react";
import { Network } from "ethers";

const walletConnectProjectId = () => {
  const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

  if (!projectId) {
    throw Error("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID not specified.");
  }

  return projectId;
};

export const supportedEthNetworks = [
  {
    chainId: 1,
    name: "Ethereum",
    currency: "ETH",
    explorerUrl: "https://etherscan.io",
  },
  {
    chainId: 11155111,
    name: "Sepolia",
    currency: "sepETH",
    explorerUrl: "https://sepolia.etherscan.io",
    rpcUrl: `https://rpc.walletconnect.org/v1/?chainId=eip155:11155111&projectId=${walletConnectProjectId()}`,
  },
].map((network) => ({
  ...network,
  rpcUrl: `https://rpc.walletconnect.org/v1/?chainId=eip155:${network.chainId}&projectId=${walletConnectProjectId()}`,
}));

export function getEnvEthereumNetwork() {
  const env = getEnvironment();
  const network =
    supportedEthNetworks.find((n) => n.chainId === env.ethChainId) ?? null;
  if (!network) {
    throw Error("Cannot find ethereum network for chainId {env.ethChainId}.");
  }

  return network;
}

let initialized = false;
export const initializeWeb3Modal = () => {
  if (initialized) {
    return;
  }
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
  if (!alchemyKey) {
    throw Error("NEXT_PUBLIC_ALCHEMY_KEY not specified.");
  }

  const network = getEnvEthereumNetwork();

  const web3meta = {
    name: metadata.title,
    description: metadata.description,
    url: metadata.url, // origin must match your domain & subdomain
    icons: [metadata.icon],
  };

  const ethersConfig = defaultConfig({
    metadata: web3meta,
    defaultChainId: network.chainId,
    auth: {
      email: false,
      socials: [],
    },
  });

  createWeb3Modal({
    ethersConfig,
    chains: [network],
    projectId: walletConnectProjectId(),
    themeMode: "light",
  });
  initialized = true;
  console.log("Web3modal initialized.");
};
