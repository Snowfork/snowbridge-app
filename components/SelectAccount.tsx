"use client";
import { trimAccount } from "@/utils/formatting";
import { FC, useEffect, useMemo, useState } from "react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { AccountInfo } from "@/utils/types";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import Image from "next/image";
import { Pencil, X } from "lucide-react";

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
  destination,
  polkadotWalletName,
  ethereumWalletName,
}) => {
  const [accountFromWallet, setBeneficiaryFromWallet] = useState(true);
  const [imageError, setImageError] = useState(false);

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
    if ((!allowManualInput || accountFromWallet) && !selectedAccount) {
      field.onChange(undefined);
    }
    if (!accountFromWallet) return;

    // if the field is not set and there are accounts available, select the first account
    if (!field.value && accounts.length > 0) {
      field.onChange(accounts[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watching for 'field' would introduce infinite loop
  }, [accounts, field.value, allowManualInput, accountFromWallet]);

  let input: JSX.Element;
  if ((!allowManualInput || accountFromWallet) && accounts.length > 0) {
    input = (
      <div className="relative">
        <Select
          key={(destination ?? "unk") + accounts.length}
          onValueChange={field.onChange}
          defaultValue={selectedAccount?.key}
          value={selectedAccount?.key}
          disabled={disabled}
        >
          <SelectTrigger className="h-auto">
            {selectedAccount ? (
              <div className="flex items-start w-full gap-2 py-0.5 self-start">
                {destination && !imageError && (
                  <Image
                    className="selectIcon mt-0.5"
                    src={`/images/${destination.toLowerCase()}.png`}
                    width={20}
                    height={20}
                    alt={destination}
                    onError={() => setImageError(true)}
                  />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="truncate">
                    {selectedAccount.type === "substrate"
                      ? `${selectedAccount.name} (${trimAccount(selectedAccount.key, 20)})`
                      : selectedAccount.name}
                  </div>
                  {((selectedAccount.type === "substrate" &&
                    polkadotWalletName) ||
                    (selectedAccount.type === "ethereum" &&
                      ethereumWalletName)) && (
                    <div className="text-xs text-muted-foreground">
                      {selectedAccount.type === "substrate"
                        ? polkadotWalletName
                        : ethereumWalletName}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <SelectValue placeholder="Select account" />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {accounts.map((account, i) =>
                account.type === "substrate" ? (
                  <SelectItem key={account.key + "-" + i} value={account.key}>
                    <SelectItemWithIcon
                      label={`${account.name} (${trimAccount(account.key, 20)})`}
                      image={destination ?? ""}
                    />
                  </SelectItem>
                ) : (
                  <SelectItem key={account.key + "-" + i} value={account.key}>
                    <SelectItemWithIcon
                      label={account.name}
                      image={destination ?? ""}
                    />
                  </SelectItem>
                ),
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
        {allowManualInput && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setBeneficiaryFromWallet(false);
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity"
            title="Input account manually"
          >
            <Pencil className="h-3 w-3 opacity-50 hover:opacity-100" />
          </button>
        )}
      </div>
    );
  } else {
    input = (
      <div className="relative">
        <Input
          key="plain"
          placeholder="0x0000000000000000000000000000000000000000"
          className="h-auto py-2"
          {...field}
        />
        {allowManualInput && accounts.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setBeneficiaryFromWallet(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity"
            title="Select from wallet"
          >
            <X className="h-3.5 w-3.5 opacity-50 hover:opacity-100" />
          </button>
        )}
      </div>
    );
  }

  return input;
};
