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
      <div className="text-xs py-2">
        Copyright © Snowfork 2024 (env: {envName})
      </div>
    </>
  );
}
