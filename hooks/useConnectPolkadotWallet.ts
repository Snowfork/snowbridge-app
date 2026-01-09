import { validateAddress } from "@/utils/validateAddress";
import { transformSs58Format } from "@/utils/formatting";
import {
  polkadotAccountsAtom,
  connectorInfoAtom,
  PolkadotAccount,
} from "@/store/polkadot";
import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { useAccounts, useStatus, useActiveConnector } from "@luno-kit/react";
import { isHex } from "@polkadot/util";

export const useConnectPolkadotWallet = (ss58Format?: number): void => {
  const setAccounts = useSetAtom(polkadotAccountsAtom);
  const setConnectorInfo = useSetAtom(connectorInfoAtom);

  const { accounts } = useAccounts();
  const status = useStatus();
  const activeConnector = useActiveConnector();

  // Update connector info when active connector changes
  useEffect(() => {
    if (activeConnector) {
      setConnectorInfo({
        id: activeConnector.id,
        name: activeConnector.name,
        icon: activeConnector.icon,
      });
    }
  }, [activeConnector, setConnectorInfo]);

  // Sync accounts from LunoKit to Jotai store
  useEffect(() => {
    if (status !== "connected" || !accounts || accounts.length === 0) {
      if (status === "disconnected") {
        setAccounts(null);
        setConnectorInfo(null);
      }
      return;
    }

    const validAccounts = accounts.filter((account) =>
      validateAddress(account.address),
    );

    const mappedAccounts: PolkadotAccount[] = validAccounts.map((account) => {
      let address = account.address;
      if (ss58Format !== undefined && !isHex(address)) {
        address = transformSs58Format(address, ss58Format);
      }
      return {
        address,
        name: account.name,
        publicKey: account.publicKey,
        type: account.type,
      };
    });

    setAccounts(mappedAccounts);
  }, [accounts, status, ss58Format, setAccounts, setConnectorInfo]);
};
