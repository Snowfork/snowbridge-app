"use client";
import { trimAccount } from "@/utils/formatting";
import {
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
} from "@/store/polkadot";
import { useAtom, useAtomValue } from "jotai";
import { FC, useState } from "react";
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

type SelectAccountProps = {
  field: any;
  allowManualInput: boolean;
  accounts: AccountInfo[];
};

export const SelectAccount: FC<SelectAccountProps> = ({
  field,
  allowManualInput,
  accounts,
}) => {
  const [accountFromWallet, setBeneficiaryFromWallet] = useState(true);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);
  if (
    !allowManualInput &&
    accountFromWallet &&
    accounts.length == 0 &&
    (polkadotAccounts == null || polkadotAccounts.length == 0)
  ) {
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

  let accountFound = false;
  for (let account of accounts) {
    if (account.key === field.value) {
      accountFound = true;
      break;
    }
  }
  if (!accountFound) {
    field.onChange(undefined);
  }

  let input: JSX.Element;
  if (!allowManualInput && accountFromWallet && accounts.length > 0) {
    input = (
      <Select
        key="controlled"
        onValueChange={field.onChange}
        value={field.value}
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
