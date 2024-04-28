import { BridgeStatus } from "@/components/bridgeStatus";
import { TransferForm } from "@/components/transfer";
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
                <MenubarTrigger>Connect Wallet</MenubarTrigger>
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
                  <h1>Transfer History</h1>
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
          <BridgeStatus />
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
