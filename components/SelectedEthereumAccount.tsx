"use client";

import { FC, useEffect } from "react";
import { getEnvironment } from "@/lib/snowbridge";
import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";

export type SelectedEthereumWalletProps = {
  field
};
export const SelectedEthereumWallet: FC<SelectedEthereumWalletProps> = ({
  field,
}) => {
  const env = getEnvironment();
  const { account, chainId } = useConnectEthereumWallet();

  useEffect(() => {
    // if the field is not set and there is an account selected, set the value.
    if (!field.value && account) {
      field.onChange(account);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watching for 'field' would introduce infinite loop
  }, [account, field.value]);

  if (account !== null && chainId !== null && chainId === env.ethChainId) {
    return (
      <Select value={account}
              onValueChange={field.onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an account" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {[account]?.map((acc) => {
              return (
                <SelectItem key={account} value={account}>
                  <SelectItemWithIcon
                    label={account}
                    link={`/images/ethereum.png`}
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
