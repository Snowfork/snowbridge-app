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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  assetHubToParachainTransfer,
  parachainToAssetHubTransfer,
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
import {
  parachainConfigs,
  SnowbridgeEnvironmentNames,
} from "@/utils/parachainConfigs";

import { TopUpXcmFee } from "./TopUpXcmFee";
import { toPolkadot } from "@snowbridge/api";
import { formatBalance } from "@/utils/formatting";

export const SwitchComponent: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);

  const [feeDisplay, setFeeDisplay] = useState("");
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [busyMessage, setBusyMessage] = useState("");
  const [
    assetHubSufficientTokenAvailable,
    setAssetHubSufficientTokenAvailable,
  ] = useState(true);
  const [
    parachainSufficientTokenAvailable,
    setParachainSufficientTokenAvailable,
  ] = useState(true);
  const [topUpCheck, setTopUpCheck] = useState({
    xcmFee: 0n,
    xcmBalance: 0n,
    xcmBalanceDestination: 0n,
  });
  const [transaction, setTransaction] = useState<SubmittableExtrinsic<
    "promise",
    ISubmittableResult
  > | null>(null);

  const parachainsInfo =
    parachainConfigs[snowbridgeEnvironment.name as SnowbridgeEnvironmentNames];

  const [tokenSymbol, setTokenSymbol] = useState<string | null>(
    parachainsInfo[0]?.switchPair[0]?.tokenMetadata.symbol,
  );

  const form: UseFormReturn<FormDataSwitch> = useForm<
    z.infer<typeof formSchemaSwitch>
  >({
    resolver: zodResolver(formSchemaSwitch),
    defaultValues: {
      source: "assethub",
      destination: parachainsInfo[0]?.id,
      token: parachainsInfo[0]?.switchPair[0]?.tokenMetadata.symbol,
      amount: "0.0",
    },
  });

  const sourceId = form.watch("source");
  const destinationId = form.watch("destination");
  const beneficiary = form.watch("beneficiary");
  const amount = form.watch("amount");
  const sourceAccount = polkadotAccount?.address ?? "";

  const beneficiaries: AccountInfo[] = useMemo(
    () =>
      polkadotAccounts?.map((x) => ({
        key: x.address,
        name: x.name || "",
        type: "substrate",
      })) || [],
    [polkadotAccounts],
  );

  useEffect(() => {
    if (sourceId === "assethub") {
      if (!parachainsInfo.some(({ id }) => id === destinationId)) {
        form.resetField("destination", {
          defaultValue: parachainsInfo[0]?.id,
        });
      }
    } else {
      form.resetField("destination", {
        defaultValue: "assethub",
      });
    }
  }, [destinationId, form, parachainsInfo, sourceId]);

  useEffect(() => {
    form.resetField("beneficiary", { defaultValue: sourceAccount });
  }, [form, sourceAccount, beneficiaries]);

  const buildTransaction = useCallback(async () => {
    if (
      !context ||
      !beneficiary ||
      !sourceId ||
      !destinationId ||
      !sourceAccount
    ) {
      return;
    }

    if (!(Number(amount) > 0)) {
      return;
    }
    try {
      let transaction;

      if (sourceId === "assethub") {
        if (destinationId === "assethub") {
          return;
        }
        const destination = parachainsInfo.find(
          ({ id }) => id === destinationId,
        )!;
        // take first switch pair - may be selectable in future version
        const switchPair = destination.switchPair[0];
        setTokenSymbol(switchPair.tokenMetadata.symbol);

        transaction = await assetHubToParachainTransfer({
          context,
          beneficiary,
          paraId: destination.parachainId,
          palletName: switchPair.id,
          amount: parseUnits(amount, switchPair.tokenMetadata.decimals),
        });
      } else {
        if (topUpCheck.xcmFee >= topUpCheck.xcmBalance) {
          return;
        }
        const { parachainId, switchPair } = parachainsInfo.find(
          ({ id }) => id === sourceId,
        )!; // TODO: handle not exists?

        setTokenSymbol(switchPair[0].tokenMetadata.symbol);

        transaction = await parachainToAssetHubTransfer({
          context,
          beneficiary,
          amount: parseUnits(amount, switchPair[0].tokenMetadata.decimals),
          parachainId,
          palletName: switchPair[0].id,
        });
      }
      const transactionFee = await transaction.paymentInfo(sourceAccount);

      setTransaction(transaction);
      setFeeDisplay(transactionFee.partialFee.toHuman());
    } catch (err) {
      console.error(err);
      setError({
        title: "Send Error",
        description: `Error occured while trying to create transaction.`,
        errors: [],
      });
    }
  }, [
    context,
    beneficiary,
    sourceId,
    destinationId,
    sourceAccount,
    topUpCheck.xcmFee,
    topUpCheck.xcmBalance,
    amount,
    parachainsInfo,
  ]);

  useEffect(() => {
    setTransaction(null);
    const timeout = setTimeout(buildTransaction, 1000);
    return () => clearTimeout(timeout);
  }, [buildTransaction]);

  const handleSufficientTokens = (
    assetHubSufficient: boolean,
    parachainSufficient: boolean,
  ) => {
    setAssetHubSufficientTokenAvailable(assetHubSufficient);
    setParachainSufficientTokenAvailable(parachainSufficient);
  };
  const handleTopUpCheck = useCallback(
    (xcmFee: bigint, xcmBalance: bigint, xcmBalanceDestination: bigint) => {
      setTopUpCheck({ xcmFee, xcmBalance, xcmBalanceDestination });
    },
    [],
  );
  const onSubmit = useCallback(async () => {
    if (!transaction || !context) {
      return;
    }

    // to do: better error information for the user.
    try {
      if (destinationId === "assethub" && !assetHubSufficientTokenAvailable) {
        setError({
          title: "Insufficient Tokens.",
          description:
            "Your account on Asset Hub does not have the required tokens. Please ensure you meet the sufficient or existential deposit requirements.",
          errors: [
            {
              kind: "toPolkadot",
              code: toPolkadot.SendValidationCode.BeneficiaryAccountMissing,
              message:
                "To complete the transaction, your Asset Hub account must hold specific tokens. Without these, the account cannot be activated or used.",
            },
          ],
        });
        return;
      } else if (!parachainSufficientTokenAvailable) {
        setError({
          title: "Insufficient Tokens.",
          description:
            "The beneficiary's account does not meet the sufficient or existential deposit requirements. Please ensure they have enough funds on the destination account to complete the transaction.",
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

      const subscanHost =
        sourceId === "assethub"
          ? "https://assethub-polkadot.subscan.io"
          : "https://spiritnet.subscan.io";
      await transaction.signAndSend(address, { signer }, (result) => {
        setBusyMessage("Currently in flight");

        if (result.isFinalized && !result.dispatchError) {
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
                window.open(
                  `${subscanHost}/extrinsic/${result.txHash}`,
                  "_blank",
                ),
            },
          });
        } else if (result.isError || result.dispatchError) {
          setBusyMessage("");
          toast.info("Transfer unsuccessful", {
            position: "bottom-center",
            closeButton: true,
            duration: 60000,
            id: "transfer_error",
            description: "Token transfer was unsuccesful.",
            important: true,
            action: {
              label: "View",
              onClick: () =>
                window.open(
                  `${subscanHost}/extrinsic/${result.txHash}`,
                  "_blank",
                ),
            },
          });
        }
      });

      setBusyMessage("");
    } catch (err) {
      setBusyMessage("");
      setError({
        title: "Transaction Failed",
        description: `Error occured while trying to send transaction.`,
        errors: [],
      });
    }
  }, [
    transaction,
    context,
    destinationId,
    assetHubSufficientTokenAvailable,
    parachainSufficientTokenAvailable,
    polkadotAccounts,
    sourceId,
    sourceAccount,
  ]);

  return (
    <>
      <Card className="w-auto md:w-2/3">
        <CardHeader>
          <CardTitle>Polar Path</CardTitle>
          <CardDescription className="hidden md:flex">
            Switch Parachain tokens for ERC-20 Parachain tokens via Asset Hub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() => onSubmit())}
              className="space-y-2"
            >
              <div className="grid grid-cols-2 space-x-2">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem {...field}>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {[
                                { id: "assethub", name: "Asset Hub" },
                                ...parachainsInfo,
                              ].map(({ id, name }) => (
                                <SelectItem key={id} value={id}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a destination" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {sourceId !== "assethub" ? (
                                <SelectItem key={"assethub"} value={"assethub"}>
                                  Asset Hub
                                </SelectItem>
                              ) : (
                                parachainsInfo.map(({ id, name }) => (
                                  <SelectItem key={id} value={id}>
                                    {name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          sourceId={sourceId}
                          destinationId={destinationId}
                          parachainInfo={parachainsInfo}
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
                  <FormItem {...field}>
                    <FormLabel>Beneficiary</FormLabel>
                    <FormDescription className="hidden md:flex">
                      Receiver account on the destination.
                    </FormDescription>
                    <FormControl>
                      <SelectAccount
                        accounts={beneficiaries}
                        field={field}
                        allowManualInput={false}
                        disabled={true}
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
                <br />
                {sourceId === "assethub" ? null : (
                  <>
                    {" "}
                    XCM Fee:{" "}
                    {formatBalance({
                      number: BigInt(topUpCheck.xcmFee),
                      decimals:
                        parachainsInfo.find(({ id }) => id === sourceId)
                          ?.switchPair?.[0].xcmFee.decimals ?? 10, // fallback to denomination of polkadot.

                      displayDecimals: 3,
                    })}{" "}
                    {
                      parachainsInfo.find(({ id }) => id === sourceId)
                        ?.switchPair[0].xcmFee.symbol
                    }
                  </>
                )}
              </div>
              <br />
              {topUpCheck.xcmFee >= topUpCheck.xcmBalance &&
              sourceId !== "assethub" ? (
                <TopUpXcmFee
                  sourceAccount={sourceAccount}
                  beneficiary={beneficiary}
                  targetChainInfo={
                    // target for transfer is source of switch
                    parachainsInfo.find(({ id }) => id === sourceId)! // TODO: what to do when not exists?
                  }
                  parachainSufficientTokenAvailable={
                    parachainSufficientTokenAvailable
                  }
                  assetHubSufficientTokenAvailable={
                    assetHubSufficientTokenAvailable
                  }
                  polkadotAccounts={polkadotAccounts!}
                  xcmBalance={topUpCheck.xcmBalance}
                  xcmBalanceDestination={topUpCheck.xcmBalanceDestination}
                  formData={form.getValues()}
                  destinationId={destinationId}
                />
              ) : (
                <Button
                  disabled={!transaction}
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
        dismiss={() => setError(null)}
      />
    </>
  );
};
