import { polkadotWalletModalOpenAtom } from "@/store/polkadot";
import { Button } from "./ui/button";
import { useAtom } from "jotai";

export function ConnectPolkadotButton() {
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);
  return (
    <Button
      className="w-full"
      variant="link"
      onClick={(e) => {
        e.preventDefault();
        setPolkadotWalletModalOpen(true);
      }}
    >
      Connect Polkadot
    </Button>
  );
}
