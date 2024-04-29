
import { Menubar, MenubarContent, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { FC } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { EthereumProvider } from "@/store/common";
import detectEthereumProvider from "@metamask/detect-provider";

type MenuProps = {
  etheruemProvider: EthereumProvider | null
  ethereumAccount: string | null
  ethereumChainId: number | null
}


export const Menu: FC<MenuProps> = ({ ethereumAccount, ethereumChainId }) => {
  const switchEthereumNetwork = useSwitchEthereumNetwork(11155111)
  const [connectToEthereumWallet, , error] = useConnectEthereumWallet()

  const EthereumWallet = () => {
    if (!ethereumAccount) {
      return (<Button onClick={connectToEthereumWallet}>Connect Ethereum</Button>)
    }
    return (<>
      {ethereumChainId !== 11155111 ? <Button onClick={switchEthereumNetwork}>Change Network</Button> : (<><p>Chain Id:</p><pre>{ethereumChainId}</pre></>)}
      <p>Ethereum Account:</p><pre>{ethereumAccount}</pre>
    </>)
  }

  if (detectEthereumProvider == null) {

  }

  return (
    <div className="flex items-center">
      <Menubar >
        <MenubarMenu>
          <MenubarTrigger>Wallet</MenubarTrigger>
          <MenubarContent className="text-sm">
            <EthereumWallet />
            <MenubarSeparator></MenubarSeparator>
            <h1>Substrate:</h1>
            <h1>0x0000</h1>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarContent>
            <h1>Transfer History</h1>
            <MenubarSeparator></MenubarSeparator>
            <a className="flex place-items-center space-x-2" href="https://github.com/Snowfork/snowbridge">
              <Avatar>
                <AvatarImage src="icons8-github.svg" />
                <AvatarFallback>GH</AvatarFallback>
              </Avatar>GitHub
            </a>
          </MenubarContent>
          <MenubarTrigger>More</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
      <Dialog open={detectEthereumProvider === undefined}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Metamask Is Not Installed</DialogTitle>
            <DialogDescription>
            Please install the Metamask extension and refresh the page.
            </DialogDescription>
            <Button
            variant="link"
            onClick={() => window.open('https://metamask.io/')}
          >
            Install Metamask
          </Button>
          <Button
            variant="link"
            onClick={() => {
              window.location.reload()
            }}
          >
            Refresh
          </Button>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>)
}