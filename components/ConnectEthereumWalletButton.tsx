import { useWeb3Modal } from "@web3modal/ethers/react";
import { Button } from "./ui/button";
import { useAtom } from "jotai";
import { ErrorDialog } from "./ErrorDialog";
import { windowEthereumErrorAtom } from "@/store/ethereum";

export function ConnectEthereumWalletButton() {
  const { open } = useWeb3Modal();
  const [windowEthereumError, setWindowEthereumError] = useAtom(
    windowEthereumErrorAtom,
  );

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
          console.log(windowEthereumError);
          setWindowEthereumError(null);
        }}
        title="Ethereum Wallet Error"
        description={(windowEthereumError ?? "Unknown Error").toString()}
      />
    </>
  );
}
