"use client";

import { FC, PropsWithChildren } from "react";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { track } from "@vercel/analytics";
import { LucideCircleX } from "lucide-react";
import { useAssetMetadata } from "@/hooks/useAssetMetadata";

export const ContextComponent: FC<PropsWithChildren> = ({ children }) => {
  const [_, __, contextError] = useSnowbridgeContext();
  useAssetMetadata();

  if (contextError !== null) {
    track("Create Snowbridge Context Failed", { contextError });
    return (
      <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
        Error connecting to Snowbridge.{" "}
        <LucideCircleX className="mx-1 text-secondary-foreground" />
      </div>
    );
  }

  return <>{children}</>;
};
