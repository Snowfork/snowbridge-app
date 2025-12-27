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
        <a
          href="https://polkadot.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-gray-800 transition-colors"
        >
          <Image
            className="opacity-80"
            src="/images/polkadot-icon.svg"
            width={18}
            height={18}
            alt="Polkadot"
          />
          <span>Polkadot</span>
        </a>
      </div>
      {envName !== "polkadot_mainnet" && <span>(env: {envName})</span>}
    </div>
  );
}
