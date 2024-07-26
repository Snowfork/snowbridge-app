"use client";

import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { cn } from "@/lib/utils";
import { snowbridgeEnvNameAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import {
  Github,
  LucideBarChart,
  LucideBookText,
  LucideBug,
  LucideHistory,
  LucideMenu,
  LucideSend,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FC } from "react";
import { Button } from "./ui/button";

export const Menu: FC = () => {
  const envName = useAtomValue(snowbridgeEnvNameAtom);

  return (
    <div className="flex items-center">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/" className="flex items-center">
              <LucideSend />
              <p className="pl-2 hidden md:flex">Transfer</p>
            </Link>
          </MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/status" className="flex items-center">
              <LucideBarChart />
              <p className="pl-2 hidden md:flex">Status</p>
            </Link>
          </MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>
            <Link href="/history" className="flex items-center">
              <LucideHistory />
              <p className="pl-2 hidden md:flex">History</p>
            </Link>
          </MenubarTrigger>
        </MenubarMenu>
        {/* <MenubarMenu>
          <MenubarTrigger>
            <LucideWallet />
            <p className="pl-2 hidden md:flex">Wallets</p>
          </MenubarTrigger>
          <MenubarContent align="center">
            <div className="w-60">
              <EthereumWallet />
              <MenubarSeparator></MenubarSeparator>
              <PolkadotWallet />
            </div>
          </MenubarContent>
        </MenubarMenu> */}
        <MenubarMenu>
          <MenubarContent align="center">
            <Button
              className="flex items-center justify-start w-auto h-auto gap-2"
              variant="link"
              onClick={() =>
                window.open("https://github.com/Snowfork/snowbridge")
              }
            >
              <Github className="w-[40px] h-[40px]" />
              <p>GitHub</p>
            </Button>
            <Button
              className="flex items-center justify-start w-auto h-auto gap-2"
              variant="link"
              onClick={() =>
                window.open(
                  "https://github.com/Snowfork/snowbridge-app/issues/new/choose",
                )
              }
            >
              <LucideBug className="w-[40px] h-[40px]" />
              <p>Report an issue</p>
            </Button>
            <Button
              className="flex items-center justify-start w-auto h-auto gap-2"
              variant="link"
              onClick={() => window.open("https://docs.snowbridge.network/")}
            >
              <LucideBookText className="w-[40px] h-[40px]" />
              <p>Docs</p>
            </Button>
            <Button
              className={cn(
                "flex items-center justify-start w-auto h-auto gap-2",
                envName === "polkadot_mainnet" ? "" : "hidden",
              )}
              variant="link"
              onClick={() =>
                window.open("https://dune.com/substrate/snowbridge")
              }
            >
              <Image
                src="https://dune.com/assets/DuneLogoCircle.svg"
                width={40}
                height={40}
                alt="Dune Logo"
              />
              <p>Snowbridge Dune Dashboard</p>
            </Button>
          </MenubarContent>
          <MenubarTrigger>
            <LucideMenu />
            <p className="pl-2 hidden md:flex">More</p>
          </MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};
