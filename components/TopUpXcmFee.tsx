import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { toPolkadot } from "@snowbridge/api";
import { useState, useCallback, FC, useMemo } from "react";
import { Button } from "./ui/button";

import { BusyDialog } from "./BusyDialog";
import { Input } from "./ui/input";
import { ErrorInfo, FormDataSwitch, FormData } from "@/utils/types";
import { useAtomValue } from "jotai";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { ParaConfig } from "@/utils/parachainConfigs";

import { parseUnits } from "ethers";
import { decodeAddress } from "@polkadot/util-crypto";
import { WalletAccount } from "@talismn/connect-wallets";
import { formatBalance } from "@/utils/formatting";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SendErrorDialog } from "./SendErrorDialog";

interface Props {
  sourceAccount: string;
  targetChainInfo: ParaConfig;
  beneficiary: string;
  parachainSufficientTokenAvailable: boolean;
  assetHubSufficientTokenAvailable: boolean;
  polkadotAccounts: WalletAccount[];
  xcmBalance: bigint;
  xcmBalanceDestination: bigint;
  formData: FormData | FormDataSwitch;
}

export const TopUpXcmFee: FC<Props> = ({
  sourceAccount,
  targetChainInfo,
  beneficiary,
  parachainSufficientTokenAvailable,
  assetHubSufficientTokenAvailable,
  polkadotAccounts,
  xcmBalance,
  xcmBalanceDestination,
  formData,
}) => {
  const context = useAtomValue(snowbridgeContextAtom);
  const router = useRouter();

  const { switchPair, parachainId } = targetChainInfo;

  const xcmFee = useMemo(() => {
    if (!switchPair || !switchPair[0]) return null;
    return formatBalance({
      number: BigInt(switchPair[0].xcmFee.amount),
      decimals: switchPair[0].xcmFee.decimals,
      displayDecimals: 3,
    });
  }, [switchPair]);

  const [busyMessage, setBusyMessage] = useState("");

  const [amountInput, setAmountInput] = useState("");

  const [error, setError] = useState<ErrorInfo | null>(null);

  const [openState, setOpen] = useState(false);

  const submitTopUp = useCallback(async () => {
    if (!context || !switchPair || !xcmFee) return;
    try {
      const parsedInput = parseUnits(
        amountInput,
        switchPair[0].xcmFee.decimals,
      );

      if (parsedInput < parseUnits(xcmFee, switchPair[0].xcmFee.decimals)) {
        setError({
          title: "Not Enough to cover fees",
          description: "The amount is too low to cover the XCM fees",
          errors: [],
        });
        return;
      }

      if (xcmBalanceDestination < parsedInput) {
        setError({
          title: "Balance too low",
          description: "XCM Balance is too low for the amount specified",
          errors: [],
        });
        return;
      }

      if (!parachainSufficientTokenAvailable) {
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
        return;
      }

      setBusyMessage("Transaction being created.");
      const api = context.polkadot.api.assetHub;

      const tx = api.tx.polkadotXcm.limitedReserveTransferAssets(
        {
          V4: {
            parents: 1,
            interior: {
              X1: [{ Parachain: parachainId }],
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
                Fungible: parsedInput,
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
        setBusyMessage("Currently in flight");

        if (result.isFinalized) {
          setBusyMessage("");
          // close top up dialog
          setOpen(false);

          toast.info("Transfer Successful", {
            position: "bottom-center",
            closeButton: true,
            duration: 60000,
            id: "transfer_success",
            description: "Token transfer was succesfully initiated.",
            important: true,
            action: {
              label: "View",
              onClick: () =>
                router.push(
                  `https://spiritnet.subscan.io/extrinsic/${result.txHash}`,
                ),
            },
          });
        }
      });
      setBusyMessage("");
    } catch (error) {
      console.error(error);
      setBusyMessage("");
      setError({
        title: "Transaction Failed",
        description: `Error occured while trying to send transaction.`,
        errors: [],
      });
    }
  }, [
    context,
    switchPair,
    xcmFee,
    amountInput,
    xcmBalanceDestination,
    parachainSufficientTokenAvailable,
    parachainId,
    beneficiary,
    polkadotAccounts,
    sourceAccount,
    router,
  ]);

  return (
    <>
      <Dialog open={openState} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full my-8">Top Up Balance</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>XCM Fee Transfer</DialogTitle>
          </DialogHeader>
          <p>
            Not enough {switchPair ? switchPair[0].xcmFee.symbol : null} for XCM
            transaction.
          </p>
          <p>Send required XCM funds from source account to the beneficiary</p>
          <DialogDescription className="flex items-center py-2">
            Source Account: {sourceAccount}
            <br />
            XCM Fee Balance:{" "}
            {formatBalance({
              number: BigInt(xcmBalance),
              decimals: switchPair[0].xcmFee.decimals,
              displayDecimals: 3,
            })}{" "}
            {switchPair[0].xcmFee.symbol}
          </DialogDescription>
          <DialogDescription className="flex items-center py-2">
            Destination Beneficiary: {beneficiary}
            <br />
            Destination XCM Fee Balance:{" "}
            {formatBalance({
              number: BigInt(xcmBalanceDestination),
              decimals: switchPair[0].xcmFee.decimals,
              displayDecimals: 3,
            })}{" "}
            {switchPair[0].xcmFee.symbol}
          </DialogDescription>
          <Input
            id="amountInput"
            type="string"
            value={amountInput}
            placeholder={xcmFee ?? "0"}
            onChange={(e) => setAmountInput(e.target.value)}
          />
          <DialogDescription className="flex items-center">
            Current XCM Fee: {xcmFee}{" "}
            {switchPair ? switchPair[0].xcmFee.symbol : null}
          </DialogDescription>

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
      <SendErrorDialog
        info={error}
        formData={formData}
        dismiss={() => setError(null)}
      />
    </>
  );
};
