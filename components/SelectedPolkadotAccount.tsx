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
import { FC, useEffect } from "react";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import { trimAccount } from "@/utils/formatting";

type SelectedPolkadotAccountProps = {
  field?: any
  source?: string;
};
export const SelectedPolkadotAccount: FC<SelectedPolkadotAccountProps> = ({
  field,
  source

}) => {
  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

  useEffect(() => {
    if (!polkadotAccount && polkadotAccounts && polkadotAccounts.length > 0) {
      setPolkadotAccount(polkadotAccounts[0].address);
    }
    // If field is set, set the field value to the selected address
    if (field && polkadotAccount) {
      field.onChange(polkadotAccount.address);
    }
  }, [polkadotAccount, polkadotAccounts, polkadotAccount]);

  if (polkadotAccounts && polkadotAccounts.length > 0) {
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
                  <SelectItemWithIcon
                    label={`${acc.name} (${trimAccount(acc.address, 18)})`}
                    image={source}
                  />
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }
};
