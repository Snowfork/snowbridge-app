import {
  polkadotAccountAtom,
  polkadotWalletModalOpenAtom,
  connectorInfoAtom,
} from "@/store/polkadot";
import { useAtom, useSetAtom } from "jotai";
import { FC, useState } from "react";
import { useConnectors, useConnect, useAccounts, useStatus } from "@luno-kit/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export const PolkadotWalletDialog: FC = () => {
  const [open, setOpen] = useAtom(polkadotWalletModalOpenAtom);
  const setPolkadotAccount = useSetAtom(polkadotAccountAtom);
  const setConnectorInfo = useSetAtom(connectorInfoAtom);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectors = useConnectors();
  const { connect } = useConnect({
    onSuccess: () => {
      setConnectingId(null);
      setError(null);
      setOpen(false);
    },
    onError: (err) => {
      setConnectingId(null);
      setError(err.message || "Failed to connect wallet");
    },
  });
  const { accounts } = useAccounts();
  const status = useStatus();

  const handleConnect = async (connectorId: string) => {
    setConnectingId(connectorId);
    setError(null);
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      setConnectorInfo({
        id: connector.id,
        name: connector.name,
        icon: connector.icon,
      });
    }
    connect({ connectorId });
  };

  const handleAccountSelect = (address: string) => {
    setPolkadotAccount(address);
    setOpen(false);
  };

  const isConnected = status === "connected" && accounts && accounts.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isConnected ? "Select Account" : "Connect Polkadot Wallet"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isConnected ? (
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.address}
                onClick={() => handleAccountSelect(account.address)}
                className="w-full p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="font-medium">{account.name || "Unnamed Account"}</div>
                <div className="text-sm text-gray-500 truncate">{account.address}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {connectors.map((connector) => {
              const isInstalled = connector.isInstalled();
              const isConnecting = connectingId === connector.id;

              return (
                <Button
                  key={connector.id}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => isInstalled && handleConnect(connector.id)}
                  disabled={!isInstalled || isConnecting}
                >
                  {connector.icon && (
                    <Image
                      src={connector.icon}
                      alt={connector.name}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{connector.name}</div>
                    {!isInstalled && (
                      <div className="text-xs text-gray-500">Not installed</div>
                    )}
                  </div>
                  {isConnecting && (
                    <div className="text-sm text-gray-500">Connecting...</div>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
