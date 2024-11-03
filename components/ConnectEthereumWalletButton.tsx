import { useSwitchNetwork, useWeb3Modal } from "@web3modal/ethers/react";
import { Button } from "./ui/button";
import { useAtom } from "jotai";
import { ErrorDialog } from "./ErrorDialog";
import { windowEthereumErrorAtom } from "@/store/ethereum";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { track } from "@vercel/analytics";
import { getEnvironment } from "@/lib/snowbridge";

export function ConnectEthereumWalletButton() {
  const { open } = useWeb3Modal();
  const env = getEnvironment();

  const [windowEthereumError, setWindowEthereumError] = useAtom(
    windowEthereumErrorAtom,
  );
  const { switchNetwork } = useSwitchNetwork();

  const { account, chainId } = useConnectEthereumWallet();
  if (account !== null && (chainId === null || chainId !== env.ethChainId)) {
    return (
      <>
        <Button
          className="w-full"
          type="button"
          variant="destructive"
          onClick={async (_) => {
            await switchNetwork(env.ethChainId);
            track("Switch Network");
          }}
        >
          Switch Network
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        className="w-full"
        type="button"
        variant="link"
        onClick={async (e) => {
          await open({ view: "Connect" });
        }}
      >
        Connect Ethereum
      </Button>
      <ErrorDialog
        open={windowEthereumError !== null}
        dismiss={() => {
          console.error(windowEthereumError);
          setWindowEthereumError(null);
        }}
        title="Ethereum Wallet Error"
        description={(windowEthereumError ?? "Unknown Error").toString()}
      />
    </>
  );
}
