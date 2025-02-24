import { FC } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { TransferSummary } from "./TransferSummary";
import { ValidationData } from "@/utils/types";
import { assetsV2 } from "@snowbridge/api";

interface TransferBusyProps {
  registry: assetsV2.AssetRegistry;
  message?: string;
  data?: ValidationData;
  onBack?: () => Promise<unknown> | unknown;
}
export const TransferBusy: FC<TransferBusyProps> = ({
  message,
  onBack,
  data,
  registry,
}) => {
  return (
    <div className="flex flex-col">
      {data !== undefined ? (
        <TransferSummary data={data} registry={registry} />
      ) : (
        <div className="hidden" />
      )}
      <div className="items-center flex flex-col mt-20">
        <Image
          className="animate-bounce mb-2"
          src="/icon.svg"
          width={32}
          height={32}
          alt="Smiling bridge"
        />
        <div>{message}</div>
        <Button className="mt-5" variant="secondary" onClick={onBack}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
