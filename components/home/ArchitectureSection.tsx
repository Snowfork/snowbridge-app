"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ArchitectureSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="mt-24 w-full px-8 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left column: Text */}
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-200">
              More Proofs, Less Trust
            </h2>
            <ul className="space-y-3 text-lg text-gray-700 dark:text-gray-200">
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  Secure interoperability by exchanging cryptographically-secure
                  proofs of finality between on-chain light clients.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  Offchain relayers are untrusted and have no capability to
                  forge messages. Anyone can spin up their own relayers.
                </span>
              </li>
            </ul>

            <h3 className="text-2xl font-semibold mt-8 mb-4 text-gray-700 dark:text-gray-200">
              Governed by the Polkadot Community
            </h3>
            <ul className="space-y-3 text-lg text-gray-700 dark:text-gray-200">
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  Snowbridge is a system bridge that is part of the{" "}
                  <a
                    href="https://github.com/paritytech/polkadot-sdk/tree/master/bridges/snowbridge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-800 dark:hover:text-gray-100"
                  >
                    Polkadot SDK
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  Upgrades are voted upon using{" "}
                  <a
                    href="https://wiki.polkadot.com/learn/learn-polkadot-opengov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-800 dark:hover:text-gray-100"
                  >
                    OpenGov
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  Built and maintained using funding from the Polkadot Treasury.
                </span>
              </li>
            </ul>

            <h3 className="text-2xl font-semibold mt-8 mb-4 text-gray-700 dark:text-gray-200">
              Defense in Depth
            </h3>
            <ul className="space-y-3 text-lg text-gray-700 dark:text-gray-200">
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  10+ incremental{" "}
                  <a
                    href="https://docs.snowbridge.network/security/audits"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-800 dark:hover:text-gray-100"
                  >
                    code audits
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  An active bug bounty program that has disbursed over $40,000
                  in rewards.
                </span>
              </li>
            </ul>
          </div>

          {/* Right column: Diagram */}
          <div
            className="glass-sub p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
            onClick={() => setIsOpen(true)}
          >
            <Image
              src="/images/architecture-light.svg"
              alt="Snowbridge Architecture - click to expand"
              width={1054}
              height={846}
              className="w-full h-auto dark:hidden"
            />
            <Image
              src="/images/architecture-dark.svg"
              alt="Snowbridge Architecture - click to expand"
              width={1054}
              height={846}
              className="w-full h-auto hidden dark:block"
            />
          </div>
        </div>
      </section>

      {/* Expanded diagram modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto p-6 glass">
          <DialogHeader className="overflow-visible">
            <DialogTitle>More Proofs, Less Trust</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <Image
              src="/images/architecture-light.svg"
              alt="Snowbridge Architecture - showing consensus and message relayers between Ethereum and Polkadot"
              width={1054}
              height={846}
              className="w-full h-auto dark:hidden"
            />
            <Image
              src="/images/architecture-dark.svg"
              alt="Snowbridge Architecture - showing consensus and message relayers between Ethereum and Polkadot"
              width={1054}
              height={846}
              className="w-full h-auto hidden dark:block"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
