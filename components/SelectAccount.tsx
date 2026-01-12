"use client";
import { trimAccount } from "@/utils/formatting";
import { FC, useEffect, useMemo, useState } from "react";
import { Input } from "./ui/input";
import { AccountInfo } from "@/utils/types";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";

type SelectAccountProps = {
  field: any;
  allowManualInput: boolean;
  accounts: AccountInfo[];
  disabled?: boolean;
  destination?: string;
  polkadotWalletName?: string;
  ethereumWalletName?: string;
};

export const SelectAccount: FC<SelectAccountProps> = ({
  field,
  allowManualInput,
  accounts,
  disabled = false,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempAddress, setTempAddress] = useState("");

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) =>
          account.key.toLowerCase() === (field.value ?? "").toLowerCase(),
      ),
    [accounts, field.value],
  );

  useEffect(() => {
    // unset account selection if selected account is no longer found in accounts
    // and manual input is not allowed
    if (!allowManualInput && !selectedAccount && field.value) {
      field.onChange(undefined);
    }

    // if the field is not set and there are accounts available, select the first account
    if (!field.value && accounts.length > 0) {
      field.onChange(accounts[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watching for 'field' would introduce infinite loop
  }, [accounts, field.value, allowManualInput]);

  const handleOpenDialog = () => {
    setTempAddress(field.value || "");
    setDialogOpen(true);
  };

  const handleSelectAccount = (address: string) => {
    field.onChange(address);
    setDialogOpen(false);
  };

  const handleConfirmCustomAddress = () => {
    if (tempAddress) {
      field.onChange(tempAddress);
    }
    setDialogOpen(false);
  };

  const displayValue = field.value
    ? trimAccount(field.value, 16)
    : "Select account";

  return (
    <div className="space-y-2">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            onClick={handleOpenDialog}
            className="flex items-center justify-between w-full h-auto px-3 py-2 text-sm rounded-md glass-sub hover:bg-white/50 dark:hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <span
              className={field.value ? "text-primary" : "text-muted-foreground"}
            >
              <span className="text-sm text-muted-foreground">Beneficiary</span>{" "}
              {displayValue}
            </span>
            <Pencil className="h-3.5 w-3.5 opacity-50" />
          </button>
        </DialogTrigger>
        <DialogContent className="glass more-blur">
          <DialogHeader>
            <DialogTitle className="text-center font-medium text-primary">
              Select Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {accounts.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Your Accounts
                </div>
                <div className="max-h-48 overflow-y-auto ui-slimscroll bg-white/40 dark:bg-slate-800/60 rounded-lg">
                  {accounts.map((account, i) => (
                    <button
                      key={account.key + "-" + i}
                      type="button"
                      onClick={() => handleSelectAccount(account.key)}
                      className={`w-full flex flex-col items-start p-3 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-md transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
                        field.value?.toLowerCase() === account.key.toLowerCase()
                          ? "bg-white/60 dark:bg-slate-700/60"
                          : ""
                      }`}
                    >
                      <span className="font-medium text-primary text-sm">
                        {account.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {trimAccount(account.key, 24)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {allowManualInput && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {accounts.length > 0 ? "Or enter address" : "Enter address"}
                </div>
                <Input
                  placeholder="0x0000000000000000000000000000000000000000"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  className="bg-white/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-600"
                />
                <Button
                  type="button"
                  onClick={handleConfirmCustomAddress}
                  className="w-full action-button"
                  disabled={!tempAddress}
                >
                  Confirm
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
