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
import { Toggle } from "./ui/toggle";
import { AccountInfo } from "@/utils/types";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import Image from "next/image";

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
      <Select
        key={(destination ?? "unk") + accounts.length}
        onValueChange={field.onChange}
        defaultValue={selectedAccount?.key}
        value={selectedAccount?.key}
        disabled={disabled}
      >
        <SelectTrigger className="h-auto items-start">
          {selectedAccount ? (
            <div className="flex items-start w-full gap-2 py-0.5">
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
                <div className="font-medium truncate">
                  {selectedAccount.type === "substrate"
                    ? `${selectedAccount.name} (${trimAccount(selectedAccount.key, 20)})`
                    : selectedAccount.name
                  }
                </div>
                {((selectedAccount.type === "substrate" && polkadotWalletName) ||
                  (selectedAccount.type === "ethereum" && ethereumWalletName)) && (
                  <div className="text-xs text-muted-foreground">
                    {selectedAccount.type === "substrate" ? polkadotWalletName : ethereumWalletName}
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
    );
  } else {
    input = (
      <Input
        key="plain"
        placeholder="0x0000000000000000000000000000000000000000"
        {...field}
      />
    );
  }

  return (
    <>
      {input}
      <div className={"flex justify-end " + (allowManualInput ? "" : "hidden")}>
        <Toggle
          defaultPressed={false}
          pressed={!accountFromWallet}
          onPressedChange={(p) => setBeneficiaryFromWallet(!p)}
          className="text-sm"
          size="xs"
        >
          Input account manually.
        </Toggle>
      </div>
    </>
  );
};
