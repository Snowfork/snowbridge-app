"use client";

import { FC } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { LucideWallet } from "lucide-react";

export const WalletNotice: FC = () => {
  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <div className="text-primary underline-offset-4 hover:underline text-sm text-red-500 ">
          Important: Wallet Support
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto">
        <div className="flex place-items-center space-x-4">
          <LucideWallet />
          <div className="space-y-1 w-60">
            You may not see your bridged assets in your favourite wallet. Wallet
            support is coming soon to Talisman, Subwallet and Nova wallet.
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
