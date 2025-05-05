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
import { useAtom, useAtomValue } from "jotai";
import { filterByAccountType, formSchemaSwitch } from "@/utils/formSchema";
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
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import { useAssetRegistry } from "@/hooks/useAssetRegistry";

export const KusamaComponent: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const { data: assetRegistry } = useAssetRegistry();

  const [feeDisplay, setFeeDisplay] = useState("");
  const [balanceCheck, setBalanceCheck] = useState("");

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

  const form: UseFormReturn<FormDataSwitch> = useForm<
    z.infer<typeof formSchemaSwitch>
  >({
    resolver: zodResolver(formSchemaSwitch),
    defaultValues: {
      source: "polkadotAssethub",
      destination: "polkadotKusama",
      token: "",
      amount: "0.0",
    },
  });

  const sourceId = form.watch("source");
  const destinationId = form.watch("destination");
  const beneficiary = form.watch("beneficiary");
  const amount = form.watch("amount");
  const watchSourceAccount = form.watch("sourceAccount");

  useEffect(() => {
    const sourceAccounts =
      polkadotAccounts?.filter(filterByAccountType("AccountId32")) ?? [];
    const sourceAccountSelected = sourceAccounts.find(
      (s) =>
        s.address === watchSourceAccount || watchSourceAccount === undefined,
    );
    if (sourceAccountSelected) {
      form.resetField("sourceAccount", {
        defaultValue: sourceAccountSelected?.address,
      });
      form.resetField("beneficiary", {
        defaultValue: sourceAccountSelected?.address,
      });
    }
  }, [watchSourceAccount, polkadotAccounts, form]);

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
    if (sourceId === "polkadotAssethub") {
      if (destinationId != "kusamaAssetHub") {
        form.resetField("destination", {
          defaultValue: "kusamaAssetHub",
        });
      }
    } else {
      form.resetField("destination", {
        defaultValue: "polkadotAssethub",
      });
    }
  }, [destinationId, form, sourceId]);

  const buildTransaction = useCallback(async () => {
    if (
      !context ||
      !beneficiary ||
      !sourceId ||
      !destinationId ||
      !watchSourceAccount
    ) {
      return;
    }

    if (!(Number(amount) > 0)) {
      return;
    }
    try {
      let transaction;

      if (sourceId === "polkadotAssethub") {
        if (destinationId === "polkadotAssethub") {
          return;
          // TODO transaction
        } else {
          // TODO transaction
        }
      }
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
    watchSourceAccount,
    amount,
  ]);

  useEffect(() => {
    setTransaction(null);
    const timeout = setTimeout(buildTransaction, 700);
    return () => clearTimeout(timeout);
  }, [buildTransaction]);

  const handleSufficientTokens = (
    assetHubSufficient: boolean,
    parachainSufficient: boolean,
  ) => {
    setAssetHubSufficientTokenAvailable(assetHubSufficient);
    setParachainSufficientTokenAvailable(parachainSufficient);
  };
  const handleBalanceCheck = (fetchBalance: string) => {
    setBalanceCheck(fetchBalance);
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

    try {
      if (destinationId === "polkadotAssethub") {
        if (!assetHubSufficientTokenAvailable) {
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
        }
        if (topUpCheck.xcmFee >= topUpCheck.xcmBalance) {
          // this shouldn't really happen because it should be caught by the top up dialogue
          setError({
            title: "Insufficient XCM Remote Fee Payment Tokens.",
            description:
              "Switches with destination Asset Hub require you to hold Relay Chain native tokens (e.g., DOT) on the source chain. You can teleport or reserve-transfer tokens to meet these requirements.",
            errors: [],
          });

          return;
        }
      }

      if (!parachainSufficientTokenAvailable) {
        setError({
          title: "Insufficient Tokens.",
          description:
            "The beneficiary's account does not meet the sufficient or existential deposit requirements. Please ensure they have enough funds on the destination account to complete the transaction.",
          errors: [],
        });
        return;
      }

      if (Number(balanceCheck) < Number(amount)) {
        setError({
          title: "Transfer amount below balance.",
          description:
            "The source's account does have enough balance to complete the transaction. Please ensure you have enough funds to complete the transaction.",
          errors: [],
        });
        return;
      }

      const { signer, address } = polkadotAccounts?.find(
        (val) => val.address === watchSourceAccount,
      )!;
      if (!signer) {
        throw new Error("Signer is not available");
      }
      setBusyMessage("Waiting for transaction to be confirmed by wallet.");

      const subscanHost =
        sourceId === "polkadotAssethub"
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
            description: "Token transfer was successfully initiated.",
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
            description: "Token transfer was unsuccessful.",
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
        description: `Error occurred while trying to send transaction.`,
        errors: [],
      });
    }
  }, [
    transaction,
    context,
    destinationId,
    parachainSufficientTokenAvailable,
    balanceCheck,
    amount,
    polkadotAccounts,
    sourceId,
    assetHubSufficientTokenAvailable,
    topUpCheck.xcmFee,
    topUpCheck.xcmBalance,
    watchSourceAccount,
  ]);

  return (
    <>
      <Card className="w-auto md:w-2/3">
        <CardHeader>
          <CardTitle>Transfer to Kusama</CardTitle>
          <CardDescription className="hidden md:flex">
            Transfer tokens from Polkadot Asset Hub to Kusama Asset Hub, and
            back.
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
                      <FormLabel>From</FormLabel>
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
                              <SelectItem
                                key={"polkadotAssethub"}
                                value={"polkadotAssethub"}
                              >
                                <SelectItemWithIcon
                                  label="Polkadot Asset Hub"
                                  image="assethub"
                                />
                              </SelectItem>
                              <SelectItem
                                key={"kusamaAssethub"}
                                value={"kusamaAssethub"}
                              >
                                <SelectItemWithIcon
                                  label="Kusama Asset Hub"
                                  image="assethub-kusama"
                                />
                              </SelectItem>
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
                      <FormLabel>To</FormLabel>
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
                              {sourceId !== "polkadotAssethub" ? (
                                <SelectItem
                                  key={"polkadotAssethub"}
                                  value={"polkadotAssethub"}
                                >
                                  <SelectItemWithIcon
                                    label="Polkadot Asset Hub"
                                    image="assethub"
                                  />
                                </SelectItem>
                              ) : (
                                <SelectItem
                                  key={"kusamaAssethub"}
                                  value={"kusamaAssethub"}
                                >
                                  <SelectItemWithIcon
                                    label="Kusama Asset Hub"
                                    image="assethub-kusama"
                                  />
                                </SelectItem>
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
                    <FormLabel>From Account</FormLabel>
                    <FormDescription className="hidden md:flex">
                      Account on the source.
                    </FormDescription>
                    <FormControl>
                      <>
                        <SelectedPolkadotAccount
                          source={sourceId}
                          ss58Format={assetRegistry.relaychain.ss58Format}
                          polkadotAccounts={
                            polkadotAccounts?.filter(
                              filterByAccountType("AccountId32"),
                            ) ?? []
                          }
                          polkadotAccount={watchSourceAccount}
                          onValueChange={field.onChange}
                        />
                        <PolkadotBalance
                          sourceAccount={watchSourceAccount}
                          sourceId={sourceId}
                          destinationId={destinationId}
                          parachainInfo=""
                          beneficiary={beneficiary}
                          handleSufficientTokens={handleSufficientTokens}
                          handleTopUpCheck={handleTopUpCheck}
                          handleBalanceCheck={handleBalanceCheck}
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
                    <FormLabel>To Account</FormLabel>
                    <FormDescription className="hidden md:flex">
                      Receiver account on the destination.
                    </FormDescription>
                    <FormControl>
                      <SelectAccount
                        accounts={beneficiaries}
                        field={field}
                        allowManualInput={false}
                        disabled={true}
                        destination="kilt"
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
                          <Input
                            type="string"
                            placeholder="0.0"
                            className="text-right"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-1/3">
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input type="string" disabled={true} value="" />
                    </FormControl>
                  </FormItem>
                </div>
              </div>
              <div className="text-sm text-right text-muted-foreground px-1">
                Fee: {feeDisplay}
                <br />
                {sourceId === "polkadotAssethub" ? null : <> XCM Fee: </>}
              </div>
              <br />
              <Button
                disabled={!transaction}
                className="w-full my-8 action-button"
                type="submit"
              >
                Submit
              </Button>
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
