"use client"

import { BridgeStatus } from "@/components/bridgeStatus";
import { Menu } from "@/components/menu";
import { TransferForm } from "@/components/transfer";
import { ethereumAccountAtom, ethereumChainIdAtom, ethereumWalletAuthorizedAtom, ethersProviderAtom } from "@/store/ethereum";
import { useAtom } from "jotai";

const chainId = 11155111

export default function Home() {
  return (
        <TransferForm />
  );
}
