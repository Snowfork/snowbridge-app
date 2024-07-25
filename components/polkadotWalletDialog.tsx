import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
  walletAtom,
} from "@/store/polkadot";
import { WalletSelect } from "@talismn/connect-components";
import { useAtom } from "jotai";
import { FC } from "react";

export const PolkadotWalletDialog: FC = () => {
  const [open, setOpen] = useAtom(polkadotWalletModalOpenAtom);
  const [, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const [, setPolkadotAccounts] = useAtom(polkadotAccountsAtom);
  const [, setWallet] = useAtom(walletAtom);
  return (
    <WalletSelect
      dappName="Snowbridge"
      open={open}
      showAccountsList
      onWalletConnectClose={() => {
        setOpen(false);
      }}
      onWalletSelected={(wallet) => {
        if (wallet.installed === true) {
          setWallet(wallet);
        }
      }}
      onUpdatedAccounts={(accounts) => {
        if (accounts != null) {
          setPolkadotAccounts(accounts);
        }
      }}
      onAccountSelected={(account) => {
        setPolkadotAccount(account.address);
      }}
    />
  );
};
