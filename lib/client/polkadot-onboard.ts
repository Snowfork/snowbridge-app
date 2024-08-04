"use client";

import { WalletAggregator } from "@polkadot-onboard/core";
import { InjectedWalletProvider } from "@polkadot-onboard/injected-wallets";
import {
  PolkadotNamespaceChainId,
  WalletConnectProvider,
} from "@polkadot-onboard/wallet-connect";
import { metadata } from "../metadata";

export const polkadotWalletAggregator: WalletAggregator = (() => {
  const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

  if (!projectId) {
    throw Error("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID not specified.");
  }

  let walletConnectParams = {
    projectId,
    metadata: {
      name: metadata.title,
      description: metadata.description,
      url: metadata.url,
      icons: [metadata.icon],
    },
    // TODO: Env
    chainIds: [
      "polkadot:91b171bb158e2d3848fa23a9f1c25182" as PolkadotNamespaceChainId,
    ],
    optionalChainIds: [
      "polkadot:91b171bb158e2d3848fa23a9f1c25182" as PolkadotNamespaceChainId,
    ],
  };
  return new WalletAggregator([
    new InjectedWalletProvider({}, metadata.title),
    new WalletConnectProvider(walletConnectParams, metadata.title),
  ]);
})();
