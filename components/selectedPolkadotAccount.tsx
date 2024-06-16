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
import { trimAccount } from "@/lib/utils";
import { FC } from "react";

export const SelectedPolkadotAccount: FC = () => {
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);

  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  if (!polkadotAccount) {
    return (
      <Button
        variant="link"
        className="w-full"
        onClick={() => setPolkadotWalletModalOpen(true)}
      >
        Connect Polkadot
      </Button>
    );
  }
  return (
    <Select
      onValueChange={(v) => setPolkadotAccount(v)}
      value={polkadotAccount.address}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select an account" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {polkadotAccounts?.map((acc) => (
            <SelectItem key={acc.address} value={acc.address}>
              <div>
                {acc.name}{" "}
                <pre className="inline md:hidden">
                  ({trimAccount(acc.address)})
                </pre>
                <pre className="hidden md:inline">({acc.address})</pre>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
