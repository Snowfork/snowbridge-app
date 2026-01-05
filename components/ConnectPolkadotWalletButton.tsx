import { walletSheetOpenAtom } from "@/store/polkadot";
import { Button } from "./ui/button";
import { useSetAtom } from "jotai";
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
  const setWalletSheetOpen = useSetAtom(walletSheetOpenAtom);
  return (
    <Button
      className={cn("w-full action-button", className)}
      variant={variant ?? "link"}
      onClick={(e) => {
        e.preventDefault();
        setWalletSheetOpen(true);
      }}
    >
      Connect Wallet
    </Button>
  );
}
