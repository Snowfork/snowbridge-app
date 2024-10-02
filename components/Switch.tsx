"use client";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  submitAssetHubToParachainTransfer,
  submitParachainToAssetHubTransfer,
} from "@/utils/onSwitch";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import {
  snowbridgeEnvironmentAtom,
  snowbridgeContextAtom,
} from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import { formSchemaSwitch } from "@/utils/formSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { AccountInfo, ErrorInfo, FormDataSwitch } from "@/utils/types";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { SelectAccount } from "./SelectAccount";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { BusyDialog } from "./BusyDialog";
import { SendErrorDialog } from "./SendErrorDialog";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";
import PolkadotBalance from "./Balances";
import { parseUnits } from "ethers";
import { toast } from "sonner";
import { parachainConfigs } from "@/utils/parachainConfigs";

import { useRouter } from "next/navigation";
import { TopUpXcmFee } from "./TopUpXcmFee";
import { toPolkadot } from "@snowbridge/api";
import { LocationSelector } from "./LocationSelector";

export const SwitchComponent: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const router = useRouter();

  const [feeDisplay, setFeeDisplay] = useState("");
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [busyMessage, setBusyMessage] = useState("");
  const [sufficientTokenAvailable, setSufficientTokenAvailable] =
    useState(true);
  const [topUpCheck, setTopUpCheck] = useState(false);
  const [transaction, setTransaction] = useState<SubmittableExtrinsic<
    "promise",
    ISubmittableResult
  > | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);

  const filteredLocations = useMemo(
    () =>
      snowbridgeEnvironment.locations
        .filter((x) => x.type !== "ethereum")
        .filter((x) => x.name !== "Muse"),
    [snowbridgeEnvironment],
  );

  const initialDestination = useMemo(
    () => filteredLocations.find((v) => v.id === "KILT"),
    [filteredLocations],
  );

  const form: UseFormReturn<FormDataSwitch> = useForm<
    z.infer<typeof formSchemaSwitch>
  >({
    resolver: zodResolver(formSchemaSwitch),
    defaultValues: {
      source: filteredLocations.find((v) => v.id === "assethub"),
      // to do: handle this better
      destination: initialDestination ?? "",
      token: initialDestination?.erc20tokensReceivable[0].id,
      beneficiary: polkadotAccount?.address ?? "",
      sourceAccount: polkadotAccount?.address ?? "",
      amount: "0.0",
    },
  });

  const source = form.watch("source");
  const destination = form.watch("destination");
  const sourceAccount = form.watch("sourceAccount");
  const beneficiary = form.watch("beneficiary");
  const amount = form.watch("amount");
  const token = form.watch("token");

  const beneficiaries: AccountInfo[] = useMemo(
    () =>
      polkadotAccounts?.map((x) => ({
        key: x.address,
        name: x.name || "",
        type: destination.type,
      })) || [],
    [polkadotAccounts, destination.type],
  );

  const handleTransaction = useCallback(async () => {
    if (
      !context ||
      !beneficiary ||
      !source ||
      !destination ||
      !sourceAccount ||
      !token
    ) {
      return;
    }

    const amountInSmallestUnit = parseUnits(amount, source.paraInfo?.decimals);
    if (!amountInSmallestUnit) {
      return;
    }
    const sendTransaction = async (
      transaction: SubmittableExtrinsic<"promise", ISubmittableResult>,
      transactionFee: string,
    ) => {
      setTransaction(transaction);
      setFeeDisplay(transactionFee);
    };

    if (source.id === "assethub") {
      if (destination.id === "assethub") {
        return;
      }
      await submitAssetHubToParachainTransfer({
        context,
        beneficiary,
        source,
        destination,
        amount: amountInSmallestUnit,
        sourceAccount,
        setError,
        setBusyMessage,
        sendTransaction,
      });
    } else {
      const { pallet } = parachainConfigs[source.name];

      submitParachainToAssetHubTransfer({
        context,
        beneficiary,
        source,
        amount: amountInSmallestUnit,
        pallet,
        sourceAccount,
        setError,
        setBusyMessage,
        sendTransaction,
      });
    }
  }, [context, beneficiary, source, destination, sourceAccount, token, amount]);

  useEffect(() => {
    handleTransaction();
  }, [handleTransaction]);

  const handleSufficientTokens = (result: boolean) => {
    setSufficientTokenAvailable(result);
  };
  const handleTopUpCheck = (result: boolean) => {
    setTopUpCheck(result);
  };
  const onSubmit = useCallback(async () => {
    if (!transaction || !context) {
      return;
    }

    // to do: better error information for the user.
    try {
      if (destination.id === "assethub" && !sufficientTokenAvailable) {
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
      } else if (!sufficientTokenAvailable) {
        setError({
          title: "Not Enough Sufficient tokens",
          description:
            "Please follow the sufficient or existential deposit, make sure the beneficiary has enough funds on the destination account.",
          errors: [],
        });
        return;
      }

      const { signer, address } = polkadotAccounts?.find(
        (val) => val.address === sourceAccount,
      )!;
      if (!signer) {
        throw new Error("Signer is not available");
      }
      setBusyMessage("Waiting for transaction to be confirmed by wallet.");
      await transaction.signAndSend(address, { signer }, (result) => {
        setBusyMessage("Currently in flight");

        if (result.isFinalized) {
          setBusyMessage("");
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
      form.reset();
    } catch (err) {
      setBusyMessage("");
      setError({
        title: "Transaction Failed",
        description: `Error occured while trying to send transaction.`,
        errors: [],
      });
      form.reset();
    }
  }, [
    transaction,
    context,
    destination.id,
    sufficientTokenAvailable,
    polkadotAccounts,
    form,
    sourceAccount,
    router,
  ]);

  return (
    <>
      <Card className="w-auto md:w-2/3">
        <CardHeader>
          <CardTitle>Switch</CardTitle>
          <CardDescription className="hidden md:flex">
            Switch Parachain tokens for ERC20 Parachain tokens via Asset Hub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() => onSubmit())}
              className="space-y-2"
            >
              <LocationSelector
                form={form}
                filteredLocations={filteredLocations}
                source={source}
                setFeeDisplay={setFeeDisplay}
                setTokenSymbol={setTokenSymbol}
              />

              <FormField
                control={form.control}
                name="sourceAccount"
                render={({ field }) => (
                  <FormItem {...field}>
                    <FormLabel>Source Account</FormLabel>
                    <FormDescription className="hidden md:flex">
                      Account on the source.
                    </FormDescription>
                    <FormControl>
                      <>
                        <SelectedPolkadotAccount />
                        <PolkadotBalance
                          sourceAccount={sourceAccount}
                          source={source}
                          destination={destination}
                          beneficiary={beneficiary}
                          handleSufficientTokens={handleSufficientTokens}
                          handleTopUpCheck={handleTopUpCheck}
                        />
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="beneficiary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beneficiary</FormLabel>
                    <FormDescription className="hidden md:flex">
                      Receiver account on the destination.
                    </FormDescription>
                    <FormControl>
                      <SelectAccount
                        accounts={beneficiaries}
                        field={field}
                        allowManualInput={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex space-x-2">
                <div className="w-2/3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="string" placeholder="0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-1/3">
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <div className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      {tokenSymbol}
                    </div>
                  </FormItem>
                </div>
              </div>
              <div className="text-sm text-right text-muted-foreground px-1">
                Transfer Fee: {feeDisplay}
              </div>
              <br />
              {/* Checks the required XCM fee balance on the source account is too low, if too low it gives an option to top the XCM fee from source account*/}
              {topUpCheck ? (
                <TopUpXcmFee
                  sourceAccount={sourceAccount}
                  source={source}
                  beneficiary={beneficiary}
                  destination={destination}
                  sufficientTokenAvailable={sufficientTokenAvailable}
                  polkadotAccounts={polkadotAccounts!}
                />
              ) : (
                <Button
                  disabled={
                    !context ||
                    !token ||
                    !amount ||
                    !beneficiary ||
                    !sourceAccount
                  }
                  className="w-full my-8"
                  type="submit"
                >
                  Submit
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      <BusyDialog open={busyMessage !== ""} description={busyMessage} />
      <SendErrorDialog
        info={error}
        formData={form.getValues()}
        destination={destination}
        dismiss={() => setError(null)}
      />
    </>
  );
};
