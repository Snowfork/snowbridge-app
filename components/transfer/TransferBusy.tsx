import { FC } from "react";
import { Button } from "../ui/button";
import { LucideLoaderCircle } from "lucide-react";
import Image from "next/image";
import { TransferSummary } from "./TransferSummary";
import { ValidationData } from "@/utils/types";

interface TransferBusyProps {
  message?: string;
  data?: ValidationData;
  onBack?: () => Promise<unknown> | unknown;
}
export const TransferBusy: FC<TransferBusyProps> = ({
  message,
  onBack,
  data,
}) => {
  return (
    <div className="flex flex-col">
      {data !== undefined ? (
        <TransferSummary data={data} />
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
