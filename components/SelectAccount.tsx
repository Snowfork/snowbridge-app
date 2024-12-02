"use client";
import { trimAccount } from "@/utils/formatting";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { useAtomValue } from "jotai";
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
import { ConnectPolkadotWalletButton } from "./ConnectPolkadotWalletButton";
import { ethereumAccountsAtom } from "@/store/ethereum";
import { ConnectEthereumWalletButton } from "./ConnectEthereumWalletButton";

type SelectAccountProps = {
  field: any;
  allowManualInput: boolean;
  accounts: AccountInfo[];
  disabled?: boolean;
  destination?: string;
};

export const SelectAccount: FC<SelectAccountProps> = ({
  field,
  allowManualInput,
  accounts,
  disabled = false,
  destination,
}) => {
  const [accountFromWallet, setBeneficiaryFromWallet] = useState(true);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);

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
    if (!allowManualInput && !selectedAccount) {
      field.onChange(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watching for 'field' would introduce infinite loop
  }, [accounts, field.value, allowManualInput]);

  if (!allowManualInput && accountFromWallet && accounts.length == 0) {
    if (
      (ethereumAccounts == null || ethereumAccounts.length == 0) &&
      destination === "ethereum"
    ) {
      return <ConnectEthereumWalletButton />;
    }
    if (polkadotAccounts == null || polkadotAccounts.length == 0) {
      return <ConnectPolkadotWalletButton />;
    }
  }

  let input: JSX.Element;
  if (!allowManualInput && accountFromWallet && accounts.length > 0) {
    input = (
      <Select
        key={(destination ?? "unk") + accounts.length}
        onValueChange={field.onChange}
        defaultValue={selectedAccount?.key}
        value={selectedAccount?.key}
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
                  <div>
                    {account.name}{" "}
                    <pre className="lg:hidden inline">
                      ({trimAccount(account.key, 18)})
                    </pre>
                    <pre className="hidden lg:inline">({account.key})</pre>
                  </div>
                </SelectItem>
              ) : (
                <SelectItem key={account.key + "-" + i} value={account.key}>
                  <pre className="lg:hidden inline">
                    {trimAccount(account.name, 18)}
                  </pre>
                  <pre className="hidden lg:inline">{account.name}</pre>
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
