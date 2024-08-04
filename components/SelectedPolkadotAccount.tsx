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
import { useWallets } from "@polkadot-onboard/react";

export const SelectedPolkadotAccount: FC = () => {
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);

  const { wallets } = useWallets();
  for (const w of wallets ?? []) {
    //w.connect();
    if (w.type === "WALLET_CONNECT") {
      console.log("AAAA", w, w.isConnected());
      //if (w.isConnected()) w.disconnect();
      if (!w.isConnected()) w.connect().then(() => console.log("connected"));
      //w.subscribeAccounts().then((x) => console.log("B", x));
    }
  }

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
