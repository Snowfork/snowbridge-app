import Image from "next/image";
import { FC } from "react";
import { useAtomValue } from "jotai";
import { PolkadotAccount, walletAtom } from "@/store/polkadot";
import { trimAccount } from "@/utils/formatting";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

type PolkadotAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: PolkadotAccount[];
  selected?: string;
  onSelect: (account: PolkadotAccount) => void;
};

export const PolkadotAccountDialog: FC<PolkadotAccountDialogProps> = ({
  open,
  onOpenChange,
  accounts,
  selected,
  onSelect,
}) => {
  const polkadotWallet = useAtomValue(walletAtom);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass more-blur">
        <DialogHeader>
          <DialogTitle className="text-center font-medium text-primary">
            Select Source Account
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {accounts.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Your Accounts</div>
              <div className="max-h-64 overflow-y-auto ui-slimscroll bg-white/40 dark:bg-slate-800/60 rounded-lg">
                {accounts.map((account, i) => (
                  <button
                    key={account.address + "-" + i}
                    type="button"
                    onClick={() => onSelect(account)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-md transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
                      selected?.toLowerCase() === account.address.toLowerCase()
                        ? "bg-white/60 dark:bg-slate-700/60"
                        : ""
                    }`}
                  >
                    {polkadotWallet?.logo?.src && (
                      <Image
                        src={polkadotWallet.logo.src}
                        width={24}
                        height={24}
                        alt="wallet"
                        className="rounded-sm flex-shrink-0"
                      />
                    )}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium text-primary text-sm">
                        {account.name || "Account"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {trimAccount(account.address, 24)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No accounts available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
