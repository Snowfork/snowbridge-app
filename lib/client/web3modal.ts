"use client";

import { createWeb3Modal, defaultConfig } from "@web3modal/ethers/react";
import { getEnvironment } from "../snowbridge";
import { metadata } from "../metadata";

(() => {
  const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

  if (!projectId) {
    throw Error("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID not specified.");
  }
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
  if (!alchemyKey) {
    throw Error("NEXT_PUBLIC_ALCHEMY_KEY not specified.");
  }

  const env = getEnvironment();
  // TODO: Move to env.
  const mainnet = {
    chainId: env.ethChainId,
    name: "Sepolia",
    currency: "sepETH",
    explorerUrl: "https://sepolia.etherscan.io",
    rpcUrl: env.config.ETHEREUM_API(alchemyKey),
  };

  const web3meta = {
    name: metadata.title,
    description: metadata.description,
    url: "/", // origin must match your domain & subdomain
    icons: ["/icon.svg"],
  };

  const ethersConfig = defaultConfig({
    metadata: web3meta,
  });

  return createWeb3Modal({
    ethersConfig,
    chains: [mainnet],
    projectId,
  });
})();
