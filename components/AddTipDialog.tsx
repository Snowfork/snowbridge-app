"use client";

import { FC, useState, useEffect, useContext } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { useAtom, useAtomValue } from "jotai";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
} from "@/store/polkadot";
import { useSetAtom } from "jotai";
import { LucideLoaderCircle } from "lucide-react";
import { addTip } from "@snowbridge/api";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { RegistryContext } from "@/app/providers";
import { getEnvironment } from "@/lib/snowbridge";
import { subscanExtrinsicLink } from "@/lib/explorerLinks";

type AddTipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: "Inbound" | "Outbound";
  nonce: number;
};

export const AddTipDialog: FC<AddTipDialogProps> = ({
  open,
  onOpenChange,
  direction,
  nonce,
}) => {
  const [tipAsset, setTipAsset] = useState<"DOT" | "ETH">("DOT");
  const [tipAmount, setTipAmount] = useState<string>("0.00");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    blockHash: string;
    txHash: string;
  } | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);

  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const setPolkadotWalletModalOpen = useSetAtom(polkadotWalletModalOpenAtom);
  const registry = useContext(RegistryContext)!;
  const environment = getEnvironment();
  const [selectedAccountAddress, setSelectedAccountAddress] = useState<
    string | null
  >(null);

  const hasWallet = polkadotAccounts && polkadotAccounts.length > 0;
  const needsAccountSelection = hasWallet && !polkadotAccount;

  const accountToUse =
    selectedAccountAddress && polkadotAccounts
      ? polkadotAccounts.find((acc) => acc.address === selectedAccountAddress)
      : polkadotAccount;

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      setEstimatedFee(null);
      if (polkadotAccount) {
        setSelectedAccountAddress(polkadotAccount.address);
      } else if (polkadotAccounts && polkadotAccounts.length > 0) {
        setSelectedAccountAddress(polkadotAccounts[0].address);
      }
    }
  }, [open, polkadotAccount, polkadotAccounts]);

  useEffect(() => {
    if (!open || !accountToUse) return;

    const estimateFee = async () => {
      try {
        const wsProvider = new WsProvider(
          environment.config.PARACHAINS[
            environment.config.ASSET_HUB_PARAID.toString()
          ],
        );
        const api = await ApiPromise.create({ provider: wsProvider });

        const tipAmountBigInt = BigInt(
          Math.floor(parseFloat(tipAmount || "0") * 1e10),
        );

        const fee = await addTip.getFee(
          api,
          registry,
          {
            direction,
            nonce: BigInt(nonce),
            tipAsset,
            tipAmount: tipAmountBigInt,
          },
          accountToUse.address,
        );

        setEstimatedFee((Number(fee) / 1e10).toFixed(4));
        await api.disconnect();
      } catch (err) {
        console.error("Fee estimation failed:", err);
        setEstimatedFee(null);
      }
    };

    estimateFee();
  }, [open]);

  const handleSubmit = async () => {
    if (!hasWallet) {
      setPolkadotWalletModalOpen(true);
      return;
    }

    if (!accountToUse) {
      setError("Please select a Polkadot account");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const wsProvider = new WsProvider(
        environment.config.PARACHAINS[
          environment.config.ASSET_HUB_PARAID.toString()
        ],
      );
      const api = await ApiPromise.create({ provider: wsProvider });

      const tipAmountBigInt = BigInt(Math.floor(parseFloat(tipAmount) * 1e10));

      const tipResult = await addTip.createAddTip(api, registry, {
        direction,
        nonce: BigInt(nonce),
        tipAsset,
        tipAmount: tipAmountBigInt,
      });

      if (!accountToUse.signer) {
        throw new Error("No signer available from wallet");
      }

      const response = await addTip.signAndSend(
        api,
        tipResult,
        accountToUse.address,
        accountToUse.signer,
      );

      setSuccess(response);
      await api.disconnect();
    } catch (err: any) {
      console.error("Add tip failed:", err);
      setError(err?.message || "Failed to add tip");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (!busy) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Tip to Transfer</DialogTitle>
          <DialogDescription>
            Add a tip to prioritize this {direction.toLowerCase()} transfer
            (nonce: {nonce})
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <div className="grid gap-4 py-4">
            {hasWallet && polkadotAccounts && polkadotAccounts.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="account">Polkadot Account</Label>
                <SelectedPolkadotAccount
                  ss58Format={
                    registry.parachains[registry.assetHubParaId].info.ss58Format
                  }
                  polkadotAccounts={polkadotAccounts}
                  polkadotAccount={selectedAccountAddress || undefined}
                  onValueChange={setSelectedAccountAddress}
                  placeholder="Select account"
                  disabled={busy}
                />
              </div>
            )}

            <div className="flex space-x-2">
              <div className="w-3/5">
                <div className="grid gap-2">
                  <Label htmlFor="tipAmount">Tip Amount</Label>
                  <Input
                    id="tipAmount"
                    type="number"
                    step="0.1"
                    min="0"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    disabled={busy}
                    placeholder="Enter tip amount"
                    className="text-left"
                  />
                </div>
              </div>
              <div className="w-2/5">
                <div className="grid gap-2">
                  <Label htmlFor="tipAsset">Tip Asset</Label>
                  <Select
                    value={tipAsset}
                    onValueChange={(value) =>
                      setTipAsset(value as "DOT" | "ETH")
                    }
                    disabled={busy}
                  >
                    <SelectTrigger id="tipAsset">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOT">DOT</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {estimatedFee && (
              <div className="text-sm text-muted-foreground">
                Estimated fee: ~{estimatedFee} DOT
              </div>
            )}

            {!hasWallet && (
              <div className="text-sm text-muted-foreground">
                Please connect your Polkadot wallet to continue
              </div>
            )}

            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="text-sm">
              <p className="font-semibold text-green-600 mb-2">
                Tip added successfully!
              </p>
              <p className="mb-1">
                <span className="font-medium">Block Hash:</span>{" "}
                <code className="text-xs">{success.blockHash}</code>
              </p>
              <p>
                <span className="font-medium">Transaction Hash:</span>{" "}
                <a
                  href={subscanExtrinsicLink(
                    registry.environment,
                    registry.assetHubParaId,
                    success.txHash,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-xs"
                >
                  {success.txHash}
                </a>
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!success ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={busy || !hasWallet || !accountToUse}
              >
                {busy ? (
                  <>
                    <LucideLoaderCircle className="animate-spin mr-2" />
                    Adding Tip...
                  </>
                ) : !hasWallet ? (
                  "Connect Wallet"
                ) : !accountToUse ? (
                  "Select Account"
                ) : (
                  "Add Tip"
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
