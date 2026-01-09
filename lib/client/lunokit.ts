"use client";

import { createConfig } from "@luno-kit/react";
import { polkadot, kusama, westend } from "@luno-kit/react/chains";
import {
  polkadotjsConnector,
  talismanConnector,
  subwalletConnector,
  enkryptConnector,
} from "@luno-kit/react/connectors";
import { metadata } from "@/lib/metadata";

export const lunoKitConfig = createConfig({
  appName: metadata.title,
  chains: [polkadot, kusama, westend],
  connectors: [
    polkadotjsConnector(),
    talismanConnector(),
    subwalletConnector(),
    enkryptConnector(),
  ],
  autoConnect: true,
});
