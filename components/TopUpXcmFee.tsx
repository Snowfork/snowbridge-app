import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { environment, toPolkadot } from "@snowbridge/api";
import React, { useState, useEffect, useCallback, FC } from "react";
import { Button } from "./ui/button";

import { BusyDialog } from "./BusyDialog";
import { Input } from "./ui/input";
import { ErrorInfo } from "@/utils/types";
import { useAtomValue } from "jotai";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { parachainConfigs, SwitchPair } from "@/utils/parachainConfigs";

import { getFormattedBalance } from "@/utils/balances";
import { parseUnits } from "ethers";
import { decodeAddress } from "@polkadot/util-crypto";
import { WalletAccount } from "@talismn/connect-wallets";

interface Props {
  sourceAccount: string;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
  beneficiary: string;
  sufficientTokenAvailable: boolean;
  polkadotAccounts: WalletAccount[];
}

export const TopUpXcmFee: FC<Props> = ({
  source,
  destination,
  sourceAccount,
  beneficiary,
  sufficientTokenAvailable,
  polkadotAccounts,
}) => {
  const context = useAtomValue(snowbridgeContextAtom);

  const [switchPair, setSwitchPair] = useState<SwitchPair | null>(null);
  const [xcmFee, setXcmFee] = useState<string | null>(null);

  // Getting the correct XCM fee and switch pair based on the props.
  useEffect(() => {
    const { switchPair: switchPair1 } =
      source.id === "assethub"
        ? parachainConfigs[destination.name]
        : parachainConfigs[source.name];

    const xcmFee1 = getFormattedBalance(
      switchPair1[0].xcmFee.amount,
      switchPair1[0].xcmFee.decimals,
    );
    setSwitchPair(switchPair1);
    setXcmFee(xcmFee1);
  }, [source.id, source.name, destination.name]);

  const [busyMessage, setBusyMessage] = useState("");

  const [amountInput, setAmountInput] = useState("");

  const [error, setError] = useState<ErrorInfo | null>(null);

  const submitTopUp = useCallback(async () => {
    if (!context) return;

    if (source.name === destination.name) return;

    if (amountInput > xcmFee) return;

    try {
      if (!sufficientTokenAvailable) {
        setError({
          title: "Not Enough Sufficient tokens",
          description: "Please follow the sufficient or existential deposit",
          errors: [
            {
              kind: "toPolkadot",
              code: toPolkadot.SendValidationCode.BeneficiaryAccountMissing,
              message:
                "Asset Hub requires that you hold specific tokens in order for an account to be active.",
            },
          ],
        });
      }

      setBusyMessage("Transaction being created.");
      const api = context.polkadot.api.assetHub;

      const tx = api.tx.polkadotXcm.limitedReserveTransferAssets(
        {
          V4: {
            parents: 1,
            interior: {
              X1: [{ Parachain: source.paraInfo?.paraId! }],
            },
          },
        },
        {
          V4: {
            parents: 0,
            interior: {
              X1: [
                {
                  AccountId32: {
                    id: decodeAddress(beneficiary),
                  },
                },
              ],
            },
          },
        },
        {
          V4: [
            {
              id: switchPair[0].xcmFee.remoteXcmFee.V4.id,
              fun: {
                Fungible: parseUnits(
                  amountInput,
                  switchPair[0].xcmFee.decimals,
                ),
              },
            },
          ],
        },
        0,
        "Unlimited",
      );

      const { signer, address } = polkadotAccounts?.find(
        (val: WalletAccount) => val.address === sourceAccount,
      )!;

      if (!signer) {
        throw new Error("Signer is not available");
      }

      setBusyMessage("Transaction in flight.");

      await tx.signAndSend(address, { signer }, (result) => {
        result.isFinalized;
      });
      setBusyMessage("");
    } catch (error) {
      console.error(error);
      setBusyMessage("");
    }
  }, [
    amountInput,
    beneficiary,
    context,
    destination,
    polkadotAccounts,
    source,
    sourceAccount,
    sufficientTokenAvailable,
    switchPair,
    xcmFee,
  ]);

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full my-8">Top Up Balance</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>XCM Fee Transfer</DialogTitle>
          </DialogHeader>
          <>
            Balance too low for XCM transaction. Send funds from source account
            to the beneficiary account
          </>
          <>Selected Account {sourceAccount}</>
          <>Selected Beneficiary {beneficiary}</>
          <Input
            id="amountInput"
            type="text"
            value={amountInput}
            placeholder={xcmFee}
            onChange={(e) => setAmountInput(e.target.value)}
          />
          <p>
            Current XCM Fee: {xcmFee}{" "}
            {parachainConfigs[source.name].switchPair[0].xcmFee.symbol}
          </p>
          <DialogFooter>
            <Button
              className="w-full my-8"
              type="submit"
              onClick={() => submitTopUp()}
              disabled={
                !context || !beneficiary || !sourceAccount || !amountInput
              }
            >
              Top Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BusyDialog open={busyMessage !== ""} description={busyMessage} />
    </>
  );
};
