import { useAtom, useAtomValue } from "jotai";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
} from "@/store/polkadot";
import { trimAccount } from "@/utils/formatting";
import { FC } from "react";

export const SelectedPolkadotAccount: FC = () => {
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);

  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

  if (!polkadotAccounts || polkadotAccounts.length == 0) {
    return (
      <Button
        variant="link"
        className="w-full"
        onClick={(e) => {
          e.preventDefault();
          setPolkadotWalletModalOpen(true);
        }}
      >
        Connect Polkadot
      </Button>
    );
  } else {
    if (!polkadotAccount) {
      setPolkadotAccount(polkadotAccounts[0].address);
    }
  }
  return (
    <Select
      onValueChange={(v) => {
        console.log(v);
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
