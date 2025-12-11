"use client";

import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { acceptedTermsOfUseAtom } from "@/store/termsOfUse";
import { useAtomValue, useSetAtom } from "jotai";
import Image from "next/image";

export function Footer() {
  const envName = useAtomValue(snowbridgeEnvNameAtom);
  const setAccepted = useSetAtom(acceptedTermsOfUseAtom);
  return (
    <>
      <div className="text-xs mb-2">
        <a className="footer-item glass-pill" onClick={() => setAccepted(false)}>
          Terms of Use
        </a>
        <a
          className="footer-item glass-pill"
          href="https://github.com/Snowfork/snowbridge"
          target="_blank"
        >
          GitHub
        </a>
        <a
          className="footer-item glass-pill"
          href="https://github.com/Snowfork/snowbridge-app/issues/new/choose"
          target="_blank"
        >
          Report an issue
        </a>
        <a
          className="footer-item glass-pill"
          href="https://docs.snowbridge.network/"
          target="_blank"
        >
          Docs
        </a>
        <a
          className="footer-item glass-pill"
          href="https://docs.snowbridge.network/security/bug-bounty"
          target="_blank"
        >
          Bug bounty
        </a>
        <a
          className="footer-item glass-pill"
          href="https://dune.com/substrate/snowbridge"
          target="_blank"
        >
          Dune Dashboard
        </a>
      </div>
      <div className="text-xs mt-4 flex items-center gap-2">
        Copyright © Snowfork {new Date().getFullYear()} / Powered and Funded by{" "}
        <Image
          src="/images/polkadot_logo.png"
          width={80}
          height={20}
          alt="Polkadot"
        />
      </div>
      <div className="text-xs py-2">
        {envName !== "polkadot_mainnet" && ` (env: ${envName})`}
      </div>
    </>
  );
}
