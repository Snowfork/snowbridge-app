"use client";

import { AppKit, CaipNetwork } from "@reown/appkit";
import { createAppKit } from "@reown/appkit-ethers/react";
import { allChains } from "@reown/appkit/networks";
import { getEnvironment } from "@/lib/snowbridge";
import { metadata } from "@/lib/metadata";

let modal: AppKit;

export const walletConnectProjectId = () => {
  const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

  if (!projectId) {
    throw Error("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID not specified.");
  }

  return projectId;
};

export const supportedEthNetworks = allChains.map((network) => ({
  ...network,
  rpcUrl: `${network.rpcUrl}&projectId=${walletConnectProjectId()}`,
}));

export function getEnvEthereumNetwork(): CaipNetwork {
  const env = getEnvironment();
  const network =
    supportedEthNetworks.find((n) => n.chainId === env.ethChainId) ?? null;
  if (!network) {
    throw Error("Cannot find ethereum network for chainId {env.ethChainId}.");
  }

  return network;
}

export const useWeb3Modal = () => {
  if (modal) {
    return modal;
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

  //const ethersAdapter = new EthersAdapter();
  modal = createAppKit({
    //adapters: [ethersAdapter],
    metadata: web3meta,
    networks: supportedEthNetworks,
    defaultNetwork: network,
    projectId: walletConnectProjectId(),
    features: {
      socials: false,
      email: false,
    },
    themeMode: "light",
    ethersConfig: {
      metadata: web3meta,
    },
  });

  return modal;
};
