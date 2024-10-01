import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { getFormattedBalance } from "@/utils/balances";
import { formatBalance } from "@/utils/formatting";

import { parachainConfigs } from "@/utils/parachainConfigs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { environment } from "@snowbridge/api";
import React, { useState, useEffect, useCallback, FC } from "react";
import { Button } from "./ui/button";
import { ApiPromise } from "@polkadot/api";

import { BusyDialog } from "./BusyDialog";
import { Input } from "./ui/input";

async function submitXcmFeeTransfer({
  destination,
  beneficiary,
  xcmFee,
  api,
}: {
  destination: environment.TransferLocation;
  beneficiary: string;
  xcmFee: { amount: string; location: {} };
  api: ApiPromise;
}) {
  return api.tx.polkadotXcm.limitedReserveTransferAssets(
    destination,
    beneficiary,
    xcmFee.location,
    xcmFee.amount,
  );
}

interface Props {
  sourceAccount: string;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
  beneficiary: string;
}

const XcmBalance: FC<Props> = ({
  source,
  destination,
  sourceAccount,
  beneficiary,
}) => {
  const [context] = useSnowbridgeContext();
  const [xcmFee, setXcmFee] = useState<string>();
  const [xcmFeeBalance, setXcmFeeBalance] = useState<string | null>(null);
  const [xcmFeeSymbol, setXcmFeeSymbol] = useState<string | null>(null);
  const [busyMessage, setBusyMessage] = useState("");

  // to do: if this is pressed it should create a Tx to submit the XCM asset from the source to destination from source account to beneficary
  const topUpXcmFee = useCallback(async () => {
    // setBusyMessage(
    //   "Top up the balance, please choose a balance with XCM fee funds and transfer",
    // );
    // const tx = await submitXcmFeeTransfer({
    //   destination,
    //   beneficiary,
    //   xcmFee,
    //   api: parachainApi,
    // });
    // const { signer, address } = polkadotAccounts?.find(
    //   (val) => val.address === sourceAccount,
    // )!;
    // if (!signer) {
    //   throw new Error("Signer is not available");
    // }
    // await tx.signAndSend(address, signer, (result) => {
    //   result.isFinalized;
    // });
  }, [destination, sourceAccount, xcmFee]);

  // To do: check the xcm fee
  // To Do: check the xcm balance of the source account and if balance on source account too low it should be able to press.
  // to do: handle the submit or top up in the parent component
  useEffect(() => {
    (async () => {
      if (!xcmFee || !context) return;
      if (destination.id === "assethub" && source.id !== "assethub") {
        const parachainApi =
          context.polkadot.api.parachains[source.paraInfo?.paraId!];
        const { switchPair } = parachainConfigs[source.name];

        try {
          const fungibleBalance = await parachainApi.query.fungibles.account(
            { V4: { parents: 1, interior: "Here" } },
            sourceAccount,
          );
          console.log(fungibleBalance);
          const xcmBalance = getFormattedBalance(
            fungibleBalance.isEmpty ? 0 : fungibleBalance?.toHuman()?.balance,
            0,
          );

          const { xcmFee } = switchPair[0];
          const formattedFee = formatBalance({
            number: BigInt(xcmFee.amount),
            decimals: xcmFee.decimals,
            displayDecimals: 3,
          });
          console.log(formattedFee);
          setXcmFee(formattedFee);
          setXcmFeeSymbol(xcmFee.symbol);

          setXcmFeeBalance(xcmBalance);
          console.log(xcmFeeBalance, xcmFee);
        } catch (e) {
          console.log(e);
        }
      }
    })();
  }, [context, destination, source, sourceAccount, xcmFee, xcmFeeBalance]);

  const handleInputChange = (event: { target: { value: string } }): void => {
    setXcmFee(event.target.value);
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full my-8" variant="outline">
            Top Up Balance
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>XCM Fee Transfer</DialogTitle>
          </DialogHeader>
          <>
            Balance too low for XCM transaction. Send funds from source account
            to the beneficiary account
          </>
          <>
            Selected Account {sourceAccount} {xcmFeeBalance}
          </>
          <>Selected Beneficiary {beneficiary}</>
          <Input type="text" value={xcmFee} onChange={handleInputChange} />
          <p>Current XCM Fee: {xcmFee}</p>
          <DialogFooter>
            <Button
              className="w-full my-8"
              type="submit"
              onClick={() => topUpXcmFee()}
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

export default XcmBalance;
