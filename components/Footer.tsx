"use client";

import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import Image from "next/image";

export function Footer() {
  const envName = useAtomValue(snowbridgeEnvNameAtom);
  return (
    <div className="text-xs text-gray-600 flex items-center justify-between w-full px-8 md:px-12">
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
        {envName !== "polkadot_mainnet" && (
          <span className="ml-2">(env: {envName})</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://docs.snowbridge.network/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-800 transition-colors"
        >
          Docs
        </a>
        <a
          href="https://docs.snowbridge.network/security/bug-bounty"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-800 transition-colors"
        >
          Bug Bounty
        </a>
        <a
          href="https://github.com/Snowfork/snowbridge-app/issues/new/choose"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-800 transition-colors"
        >
          Contact
        </a>
        <a
          href="https://github.com/Snowfork/snowbridge"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <Image src="/images/github.svg" width={16} height={16} alt="GitHub" />
        </a>
        <a
          href="https://x.com/_snowbridge"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <Image
            src="/images/twitter-x.svg"
            width={16}
            height={16}
            alt="X (Twitter)"
          />
        </a>
      </div>
    </div>
  );
}
