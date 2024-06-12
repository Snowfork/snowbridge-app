"use client";

import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import { FC, PropsWithChildren } from "react";
import { Button } from "./ui/button";
import { windowEthereumAtom } from "@/store/ethereum";
import { LucideLoaderCircle } from "lucide-react";

export const ContextComponent: FC = ({ children }: PropsWithChildren) => {
  const context = useAtomValue(snowbridgeContextAtom);
  const ethereum = useAtomValue(windowEthereumAtom);
  const { shouldSwitchNetwork, switchNetwork } = useSwitchEthereumNetwork();

  if (ethereum == null) {
    return (
      <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
        Waiting for Ethereum Wallet{" "}
        <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
      </div>
    );
  }
  if (shouldSwitchNetwork) {
    return (
      <div className="flex-col">
        <div className="flex mb-2">Incorrect Ethereum network selected.</div>
        <div className="flex justify-center">
          <Button variant="destructive" onClick={switchNetwork}>
            Switch Network
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
