"use client";

import { getEnvironment } from "@/lib/snowbridge";
import { metadata } from "@/lib/metadata";
import { AppKit, createAppKit } from "@reown/appkit/react";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";

const walletConnectProjectId = () => {
  const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

  if (!projectId) {
    throw Error("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID not specified.");
  }

  return projectId;
};

export const supportedEthNetworks = [mainnet, sepolia];

export function getEnvEthereumNetwork() {
  const env = getEnvironment();
  const network =
    supportedEthNetworks.find((n) => n.id === env.ethChainId) ?? null;
  if (!network) {
    throw Error("Cannot find ethereum network for chainId {env.ethChainId}.");
  }

  return network;
}

let initialized = false;
let modal: AppKit;
export const initializeWeb3Modal = () => {
  if (initialized) {
    return;
  }
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
  if (!alchemyKey) {
    throw Error("NEXT_PUBLIC_ALCHEMY_KEY not specified.");
  }

  const network = getEnvEthereumNetwork();

  modal = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [network],
    themeMode: "light",
    metadata: {
      name: metadata.title,
      description: metadata.description,
      url: metadata.url, // origin must match your domain & subdomain
      icons: [metadata.icon],
    },
    projectId: walletConnectProjectId(),
    features: {
      email: false,
      socials: [],
    },
  });
  initialized = true;
  console.log("Web3modal initialized.");
};

export function getModalError() {
  if (!initialized || !modal) {
    console.warn("getModalError: modal not initialized.");
    return undefined;
  }
  return modal.getError();
}
