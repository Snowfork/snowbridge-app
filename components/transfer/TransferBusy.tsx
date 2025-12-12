import { FC } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { ValidationData } from "@/utils/types";

interface TransferBusyProps {
  message?: string;
  data?: ValidationData;
  onBack?: () => Promise<unknown> | unknown;
}
export const TransferBusy: FC<TransferBusyProps> = ({ message, onBack }) => {
  return (
    <div className="flex flex-col">
      <div className="items-center flex flex-col mt-5">
        <Image
          className="animate-bounce mb-2"
          src="/icon.svg"
          width={32}
          height={32}
          alt="Smiling bridge"
        />
        <div>{message}</div>
        <Button
          className="mt-5 glass-button"
          variant="secondary"
          onClick={onBack}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
