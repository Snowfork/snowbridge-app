"use client";

import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import Image from "next/image";

export function Footer() {
  const envName = useAtomValue(snowbridgeEnvNameAtom);
  return (
    <div className="text-xs text-gray-600 flex items-center justify-center gap-2">
      <div className="flex items-center gap-1">
        Powered and Funded by{" "}
        <Image
          className={"opacity-80"}
          src="/images/polkadot_new.png"
          width={100}
          height={17}
          alt="Polkadot"
        />
      </div>
      {envName !== "polkadot_mainnet" && <span>(env: {envName})</span>}
    </div>
  );
}
