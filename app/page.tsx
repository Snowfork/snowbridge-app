import { TransferForm } from "@/components/transfer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Menubar, MenubarContent, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 lg:p-24">
      <div className="w-full max-w-5xl gap-4 flex flex-col">
        <div className="w-full place-items-center justify-between flex">
          <h1 className="text-2xl font-semibold lg:text-4xl">Snowbridge</h1>
          <div className="flex items-center">
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>Wallet</MenubarTrigger>
                <MenubarContent>
                  <h1>Substrate:</h1>
                  <h1>0x0000</h1>
                  <MenubarSeparator></MenubarSeparator>
                  <h1>Ethereum:</h1>
                  <h1>0x0000</h1>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarContent>
                  <h1>History</h1>
                  <MenubarSeparator></MenubarSeparator>
                  <h1>GitHub</h1>
                  <h1>0x0000</h1>
                </MenubarContent>
                <MenubarTrigger>More</MenubarTrigger>
              </MenubarMenu>
            </Menubar>
          </div>
        </div>
        <div className="flex justify-center">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">Bridge Status: <span className="text-red-600">Delayed</span></Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-auto">
              <div className="flex place-items-center space-x-4">
                <Avatar>
                  <AvatarImage src="https://github.com/vercel.png" />
                  <AvatarFallback>VC</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p>To Polkadot: <span className="text-green-700">Normal 10 min 5 secs</span></p>
                  <p>To Ethereum: <span className="text-red-700">Delayed 32 min 6 secs</span></p>
                  <a className="text-xs" href="/">See more</a>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>
      <div className="w-full max-w-5xl flex place-content-center">
        <TransferForm />
      </div>
      <div className="w-full max-w-5xl flex flex-col place-items-center text-sm">
        <div className="items-center">
          Brought by Snowfork
        </div>
        <p className="text-xs">Copyright © Snowfork 2024 (env: rococo_sepolia)</p>
      </div>
    </main>
  );
}
