import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { FC, useState } from "react";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import { transformSs58Format, trimAccount } from "@/utils/formatting";
import { isHex } from "@polkadot/util";
import { WalletAccount } from "@talismn/connect-wallets";
import Image from "next/image";

type SelectedPolkadotAccountProps = {
  source?: string;
  ss58Format: number;
  polkadotAccounts: WalletAccount[];
  polkadotAccount?: string;
  onValueChange?: (address: string) => void;
  placeholder?: string;
  walletName?: string;
};

export const SelectedPolkadotAccount: FC<SelectedPolkadotAccountProps> = ({
  onValueChange,
  source,
  ss58Format,
  polkadotAccounts,
  polkadotAccount,
  placeholder,
  walletName,
}) => {
  const [imageError, setImageError] = useState(false);
  const selectedAccount = polkadotAccounts.find(
    (acc) => acc.address === (polkadotAccount ?? polkadotAccounts[0]?.address)
  );

  let selectedAddress = selectedAccount?.address ?? "";
  if (selectedAddress && !isHex(selectedAddress)) {
    selectedAddress = transformSs58Format(selectedAddress, ss58Format);
  }

  return (
    <Select
      onValueChange={onValueChange}
      value={polkadotAccount ?? polkadotAccounts[0]?.address}
    >
      <SelectTrigger className="h-auto">
        {selectedAccount ? (
          <div className="flex items-start w-full py-0.5 self-start">
            {source && !imageError && (
              <Image
                className="selectIcon mt-0.5"
                src={`/images/${source.toLowerCase()}.png`}
                width={20}
                height={20}
                alt={source}
                onError={() => setImageError(true)}
              />
            )}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="font-medium truncate">
                {selectedAccount.name ?? trimAccount(selectedAddress, 22)} ({trimAccount(selectedAddress, 22)})
              </div>
              {walletName && (
                <div className="text-xs text-muted-foreground">{walletName}</div>
              )}
            </div>
          </div>
        ) : (
          <SelectValue placeholder={placeholder ?? "Select an account"} />
        )}
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
