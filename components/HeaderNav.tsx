"use client";

import Image from "next/image";
import Link from "next/link";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { useSetAtom, useAtomValue } from "jotai";
import { acceptedTermsOfUseAtom } from "@/store/termsOfUse";
import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { Menu as MenuIcon, X } from "lucide-react";
import { useState } from "react";

export function HeaderNav() {
  const setAccepted = useSetAtom(acceptedTermsOfUseAtom);
  const envName = useAtomValue(snowbridgeEnvNameAtom);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop navigation */}
      <div className="hidden md:flex items-center">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div className="flex items-center cursor-pointer">
              <Image
                src="/images/logo-blue.png"
                width={40}
                height={40}
                alt="Snowbridge"
              />
              <h1 className="text-lg px-2 ml-2 flex items-center">
                Snowbridge{" "}
                <svg
                  width="12px"
                  height="12px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="opacity-70 ml-1"
                >
                  <path
                    d="M10.6979 16.2453L6.31787 9.75247C5.58184 8.66118 6.2058 7 7.35185 7L16.6482 7C17.7942 7 18.4182 8.66243 17.6821 9.75247L13.3021 16.2453C12.623 17.2516 11.377 17.2516 10.6979 16.2453Z"
                    fill="currentColor"
                  />
                </svg>
              </h1>
            </div>
          </HoverCardTrigger>
          <HoverCardContent
            className="w-56 glass-sub p-3 relative"
            align="start"
            sideOffset={8}
          >
            <div className="flex flex-col space-y-3">
              <a
                className="text-xs text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={() => setAccepted(false)}
              >
                Terms of Use
              </a>
              <a
                className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
                href="https://github.com/Snowfork/snowbridge"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
                href="https://github.com/Snowfork/snowbridge-app/issues/new/choose"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report an Issue
              </a>
              <a
                className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
                href="https://docs.snowbridge.network/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Docs
              </a>
              <a
                className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
                href="https://docs.snowbridge.network/security/bug-bounty"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bug Bounty
              </a>
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <a
                href="https://github.com/Snowfork/snowbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <Image
                  src="/images/github.svg"
                  width={16}
                  height={16}
                  alt="GitHub"
                />
              </a>
              <a
                href="https://twitter.com/snowbridge_"
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
          </HoverCardContent>
        </HoverCard>

        {/* Navigation links in same container */}
        <nav className="flex items-center ml-5">
          <Link
            href="/"
            className="px-3 text-base text-gray-500 hover:text-gray-700 transition-colors"
          >
            Send
          </Link>
          <Link
            href="/activity"
            className="px-3 text-base text-gray-500 hover:text-gray-700 transition-colors"
          >
            Activity
          </Link>
        </nav>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden flex items-center">
        <div className="flex items-center">
          <Image
            src="/images/logo-blue.png"
            width={40}
            height={40}
            alt="Snowbridge"
          />
          <h1 className="text-2xl px-2 ml-2 text-gray-600">Snowbridge</h1>
        </div>
        <button
          type="button"
          className="ml-auto p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <MenuIcon className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 px-4 py-3 z-50">
          <div className="flex flex-wrap gap-2 justify-center glass rounded-2xl p-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Transfer
            </Link>
            {envName === "westend_sepolia" ? null : (
              <Link
                href="/switch"
                className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Polar Path
              </Link>
            )}
            {envName === "polkadot_mainnet" ? (
              <Link
                href="/kusama"
                className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kusama
              </Link>
            ) : null}
            <Link
              href="/activity"
              className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Activity
            </Link>
            <a
              className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium cursor-pointer"
              onClick={() => {
                setMobileMenuOpen(false);
                setAccepted(false);
              }}
            >
              Terms of Use
            </a>
            <a
              href="https://docs.snowbridge.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full bg-white/30 text-primary text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Docs
            </a>
          </div>
        </div>
      )}
    </>
  );
}
