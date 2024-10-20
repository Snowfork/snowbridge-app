import { useAtom, useAtomValue } from "jotai";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import { trimAccount } from "@/utils/formatting";
import { FC, useEffect } from "react";
import { ConnectPolkadotWalletButton } from "./ConnectPolkadotWalletButton";

export const SelectedPolkadotAccount: FC = () => {
  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

  useEffect(() => {
    if (!polkadotAccount && polkadotAccounts && polkadotAccounts.length > 0) {
      setPolkadotAccount(polkadotAccounts[0].address);
    }
  }, [setPolkadotAccount, polkadotAccounts, polkadotAccount]);

  if (!polkadotAccounts || polkadotAccounts.length == 0) {
    return <ConnectPolkadotWalletButton />;
  }
  return (
    <Select
      onValueChange={(v) => {
        setPolkadotAccount(v);
      }}
      value={(polkadotAccount ?? polkadotAccounts[0]).address}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select an account" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {polkadotAccounts?.map((acc) => {
            return (
              <SelectItem key={acc.address} value={acc.address}>
                <div>
                  {acc.name}{" "}
                  <pre className="inline md:hidden">
                    ({trimAccount(acc.address)})
                  </pre>
                  <pre className="hidden md:inline">({acc.address})</pre>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
