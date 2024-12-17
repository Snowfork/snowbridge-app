"use client";

import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { acceptedTermsOfUseAtom } from "@/store/termsOfUse";
import { useAtomValue, useSetAtom } from "jotai";

export function Footer() {
  const envName = useAtomValue(snowbridgeEnvNameAtom);
  const setAccepted = useSetAtom(acceptedTermsOfUseAtom);
  return (
    <>
      <p
        className="text-xs py-2 underline font-semibold cursor-pointer"
        onClick={() => setAccepted(false)}
      >
        Terms of Use
      </p>
      <div className="text-xs">
        <a className="footer-item" href="https://github.com/Snowfork/snowbridge" target="_blank">GitHub</a>
        <a className="footer-item" href="https://github.com/Snowfork/snowbridge-app/issues/new/choose" target="_blank">Report an issue</a>
        <a className="footer-item" href="https://docs.snowbridge.network/" target="_blank">Docs</a>
        <a className="footer-item" href="https://dune.com/substrate/snowbridgee" target="_blank">Dune Dashboard</a>
      </div>
      <div className="text-xs py-2">
        Copyright © Snowfork 2024 (env: {envName})
      </div>
    </>
  );
}
