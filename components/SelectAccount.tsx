"use client";
import { trimAccount } from "@/utils/formatting";
import {
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
} from "@/store/polkadot";
import { useAtom, useAtomValue } from "jotai";
import { FC, useEffect, useState } from "react";
import { Button } from "./ui/button";
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
import { ConnectPolkadotWalletButton } from "./ConnectPolkadotWalletButton";

type SelectAccountProps = {
  field: any;
  allowManualInput: boolean;
  accounts: AccountInfo[];
  disabled?: boolean;
};

export const SelectAccount: FC<SelectAccountProps> = ({
  field,
  allowManualInput,
  accounts,
  disabled = false,
}) => {
  const [accountFromWallet, setBeneficiaryFromWallet] = useState(true);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);

  useEffect(() => {
    // unset account selection if selected account is no longer found in accounts
    if (
      !allowManualInput &&
      !accounts.find((account) => account.key === field.value)
    ) {
      field.onChange(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watching for 'field' would introduce infinite loop
  }, [accounts, field.value, allowManualInput]);

  if (
    !allowManualInput &&
    accountFromWallet &&
    accounts.length == 0 &&
    (polkadotAccounts == null || polkadotAccounts.length == 0)
  ) {
    return <ConnectPolkadotWalletButton />;
  }

  let input: JSX.Element;
  if (!allowManualInput && accountFromWallet && accounts.length > 0) {
    input = (
      <Select
        key="controlled"
        onValueChange={field.onChange}
        value={field.value}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {accounts.map((account, i) =>
              account.type === "substrate" ? (
                <SelectItem key={account.key + "-" + i} value={account.key}>
                  <div>{account.name}</div>
                  <pre className="md:hidden inline">
                    {trimAccount(account.key, 18)}
                  </pre>
                  <pre className="hidden md:inline">{account.key}</pre>
                </SelectItem>
              ) : (
                <SelectItem key={account.key + "-" + i} value={account.key}>
                  <pre className="md:hidden inline">
                    {trimAccount(account.name, 18)}
                  </pre>
                  <pre className="hidden md:inline">{account.name}</pre>
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
          className="text-xs"
        >
          Input account manually.
        </Toggle>
      </div>
    </>
  );
};
