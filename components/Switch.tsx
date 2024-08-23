"use client";

import { FC, useEffect, useState } from "react";
import { assets } from "@snowbridge/api";
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
} from "@/utils/onSubmit";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { SelectAccount } from "./SelectAccount";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { formatBalance } from "@/utils/formatting";
import { BusyDialog } from "./BusyDialog";
import { SendErrorDialog } from "./SendErrorDialog";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";

export const SwitchComponent: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);

  const [error, setError] = useState<ErrorInfo | null>(null);
  const [busyMessage, setBusyMessage] = useState("");
  const [balanceDisplay, setBalanceDisplay] = useState("Fetching...");

  const filteredLocations = snowbridgeEnvironment.locations
    .filter((x) => x.type !== "ethereum")
    .filter((x) => x.name !== "Muse");

  const initialDestination = filteredLocations.find((v) => v.id === "rilt");
  const form: UseFormReturn<FormDataSwitch> = useForm<
    z.infer<typeof formSchemaSwitch>
  >({
    resolver: zodResolver(formSchemaSwitch),
    defaultValues: {
      source: filteredLocations.find((v) => v.id === "assethub"),
      destination: initialDestination,
      token: initialDestination?.erc20tokensReceivable[0].id,
      beneficiary: polkadotAccount?.address ?? "",
      sourceAccount: polkadotAccount?.address ?? "",
      amount: "0.0",
    },
  });

  const source = form.watch("source");
  const destination = form.watch("destination");
  const account = form.watch("sourceAccount");
  const beneficiaries: AccountInfo[] = [];
  polkadotAccounts
    ?.map((x) => {
      return { key: x.address, name: x.name || "", type: destination.type };
    })
    .forEach((x) => beneficiaries.push(x));

  useEffect(() => {
    if (!context || !account || !source) return;

    // To do: Fix balance querying.
    // const fetchBalance = async () => {
    //   try {
    //     let balance = "Fetching...";

    //     if (source.name === "assethub") {
    //       const { data } =
    //         await context.polkadot.api.assetHub.query.system.account(account);
    //       balance = data.toHuman().free;
    //     } else if (source.paraInfo) {
    //       const { data } =
    //         await context.polkadot.api.parachains[
    //           source.paraInfo.paraId!
    //         ].query.system.account(account);
    //       balance = data.toHuman().free;
    //     }
    //     balance = "12,1230123,10123";
    //     const formattedBalance = formatBalance({
    //       number: BigInt(balance.replace(/,/g, "")),
    //       decimals: source.paraInfo?.decimals || 12,
    //     });
    //     setBalanceDisplay(formattedBalance);
    //   } catch (err) {
    //     setBalanceDisplay("unknown");
    //     setError({
    //       title: "Error",
    //       description: `Could not fetch asset balance.`,
    //       errors: [],
    //     });
    //   }
    // };

    // fetchBalance();
    setBalanceDisplay("1");
  }, [account, context, source]);

  useEffect(() => {
    if (source && source.destinationIds.length > 0) {
      const newDestinationId = source.destinationIds.filter(
        (x) => x !== "ethereum",
      )[0];
      const selectedDestination = filteredLocations.find(
        (v) => v.id === newDestinationId,
      );
      const currentDestination = form.getValues("destination");

      if (currentDestination?.id !== newDestinationId && selectedDestination) {
        if (selectedDestination) {
          form.setValue("destination", selectedDestination);
          const newToken =
            selectedDestination.erc20tokensReceivable[0]?.address || "";
          if (form.getValues("token") !== newToken) {
            form.setValue("token", newToken);
          }
        }
      }
    }
  }, [source, filteredLocations, form]);

  const onSubmit = async (data: FormDataSwitch) => {
    try {
      const { sourceAccount, source, destination, token, beneficiary, amount } =
        data;

      if (!context) {
        throw new Error("Context is not available");
      }
      const tokenMetadata = await assets.assetErc20Metadata(context, token);

      const sendTransfer = async (
        transfer: SubmittableExtrinsic<"promise", ISubmittableResult>,
      ) => {
        const { signer, address } = polkadotAccounts?.find(
          (val) => val.address === sourceAccount,
        )!;
        if (!signer) {
          throw new Error("Signer is not available");
        }

        await transfer.signAndSend(address, { signer });
      };

      if (source.id === "assethub") {
        await submitAssetHubToParachainTransfer({
          context,
          beneficiary,
          source,
          destination,
          amount,
          tokenMetadata,
          setError,
          setBusyMessage,
          sendTransfer,
        });
      } else {
        await submitParachainToAssetHubTransfer({
          context,
          beneficiary,
          source,
          amount,
          tokenMetadata,
          setError,
          setBusyMessage,
          sendTransfer,
        });
      }
    } catch (err) {
      setError({
        title: "Transaction Failed",
        description: `Error occured while trying to send transaction.`,
        errors: [],
      });
    }
  };

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
              onSubmit={form.handleSubmit((data) => onSubmit(data))}
              className="space-y-2"
            >
              <div className="grid grid-cols-2 space-x-2">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            const selectedSource = filteredLocations.find(
                              (location) => location.id === value,
                            );
                            if (selectedSource) {
                              field.onChange(selectedSource);
                            }
                          }}
                          value={field.value.id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {filteredLocations.map((location) => (
                                <SelectItem
                                  key={location.id}
                                  value={location.id}
                                >
                                  {location.name}
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
                          onValueChange={(value) => {
                            const selectedDestination = filteredLocations.find(
                              (location) => location.id === value,
                            );
                            if (selectedDestination) {
                              field.onChange(selectedDestination);
                            }
                          }}
                          value={field.value.id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a destination" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {source.destinationIds.map((destinationId) => {
                                const availableDestination =
                                  filteredLocations.find(
                                    (v) => v.id === destinationId,
                                  )!;

                                if (!availableDestination) {
                                  return;
                                }
                                return (
                                  <SelectItem
                                    key={availableDestination.id}
                                    value={availableDestination.id}
                                  >
                                    {availableDestination.name}
                                  </SelectItem>
                                );
                              })}
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

                        <div
                          className={
                            "text-sm text-right text-muted-foreground px-1 "
                          }
                        >
                          Balance: {balanceDisplay}
                        </div>
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
                    <FormLabel>Amount</FormLabel>
                    <div className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      {source.name}
                    </div>
                  </FormItem>
                </div>
              </div>
              <div className="text-sm text-right text-muted-foreground px-1">
                Transfer Fee: {""}
              </div>
              <br />
              <Button
                // disabled={context === null || token === null}
                className="w-full my-8"
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
        destination={destination}
        dismiss={() => setError(null)}
      />
    </>
  );
};
