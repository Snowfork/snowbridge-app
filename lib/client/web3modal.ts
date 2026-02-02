"use client";

import { getEnvironment } from "@/lib/snowbridge";
import { metadata } from "@/lib/metadata";
import { AppKit, createAppKit } from "@reown/appkit/react";
import {
  AppKitNetwork,
  mainnet,
  moonbeam,
  sepolia,
} from "@reown/appkit/networks";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";

const walletConnectProjectId = () => {
  const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

  if (!projectId) {
    throw Error("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID not specified.");
  }

  return projectId;
};

export const supportedEthNetworks: AppKitNetwork[] = [
  mainnet,
  sepolia,
  moonbeam,
];

export function getEnvEthereumNetwork() {
  const { ethChainId } = getEnvironment();
  return getEthereumNetwork(ethChainId);
}

export function getEthereumNetwork(chainId: number) {
  const network = supportedEthNetworks.find((n) => n.id === chainId) ?? null;
  if (!network) {
    throw Error(`Cannot find ethereum network for chainId ${chainId}.`);
  }

  return network;
}

let initialized = false;
let modal: AppKit;
export const initializeWeb3Modal = () => {
  if (initialized) {
    return;
  }
  const network = getEnvEthereumNetwork();

  modal = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [network, moonbeam],
    themeMode: "light",
    customRpcUrls: {
      "eip155:1284": [{ url: "https://rpc.api.moonbeam.network" }],
    },
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

export function getChainId() {
  return modal.getChainId();
}

export function switchNetwork(appKitNetwork: AppKitNetwork) {
  modal.switchNetwork(appKitNetwork);
}

export function getModalError() {
  if (!initialized || !modal) {
    console.warn("getModalError: modal not initialized.");
    return undefined;
  }
  return modal.getError();
}

export async function openWalletModal(view: "Connect" | "Account" = "Connect") {
  if (!initialized || !modal) {
    console.warn("openWalletModal: modal not initialized.");
    return;
  }
  await modal.open({ view });
}

export async function disconnectWallet() {
  if (!initialized || !modal) {
    console.warn("disconnectWallet: modal not initialized.");
    return;
  }
  // Use modal's disconnect method directly
  if (typeof (modal as any).disconnect === "function") {
    await (modal as any).disconnect();
    return;
  }
  // Fallback: try adapter's connectionControllerClient disconnect
  const adapter = (modal as any).adapters?.[0];
  if (adapter?.connectionControllerClient?.disconnect) {
    await adapter.connectionControllerClient.disconnect();
    return;
  }
  // Last fallback: open Account view
  await modal.open({ view: "Account" });
}
