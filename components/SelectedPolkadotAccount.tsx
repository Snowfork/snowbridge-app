import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { FC } from "react";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import { transformSs58Format, trimAccount } from "@/utils/formatting";
import { assetsV2 } from "@snowbridge/api";
import { isHex } from "@polkadot/util";
import { WalletAccount } from "@talismn/connect-wallets";

type SelectedPolkadotAccountProps = {
  source?: string;
  ss58Format: number;
  polkadotAccounts: WalletAccount[];
  polkadotAccount?: string;
  onValueChange?: (address: string) => void;
};

export const SelectedPolkadotAccount: FC<SelectedPolkadotAccountProps> = ({
  onValueChange,
  source,
  ss58Format,
  polkadotAccounts,
  polkadotAccount,
}) => {
  return (
    <Select
      onValueChange={onValueChange}
      value={polkadotAccount ?? polkadotAccounts[0]?.address}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select an account" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {polkadotAccounts.map((acc) => {
            let address = acc.address;
            if (!isHex(address)) {
              address = transformSs58Format(address, ss58Format);
            }
            return (
              <SelectItem key={acc.address} value={acc.address}>
                <SelectItemWithIcon
                  label={`${acc.name} (${trimAccount(address, 22)})`}
                  image={source ?? ""}
                />
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
