import { polkadotWalletModalOpenAtom } from "@/store/polkadot";
import { Button } from "./ui/button";
import { useAtom } from "jotai";
import { cn } from "@/lib/utils";
interface ConnectPolkadotWalletButtonProps {
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | null
    | undefined;
}
export function ConnectPolkadotWalletButton({
  className,
  variant,
}: ConnectPolkadotWalletButtonProps) {
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);
  return (
    <Button
      className={cn("w-full", className)}
      variant={variant ?? "link"}
      onClick={(e) => {
        e.preventDefault();
        setPolkadotWalletModalOpen(true);
      }}
    >
      Connect Polkadot
    </Button>
  );
}
