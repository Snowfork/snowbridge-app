"use client";

import { FC, useEffect, useState } from "react";
import { Context, assets } from "@snowbridge/api";
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

import { polkadotAccountsAtom } from "@/store/polkadot";
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
import { cn } from "@/lib/utils";
import { parseAmount } from "@/utils/balances";
import { formatBalance } from "@/utils/formatting";
import { parseUnits } from "ethers/utils";

export const SwitchComponent: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [busyMessage, setBusyMessage] = useState("");
  const [balanceDisplay, setBalanceDisplay] = useState("0.0");
  const filteredLocations = snowbridgeEnvironment.locations
    .filter((x) => x.type !== "ethereum")
    .filter((x) => x.name !== "Muse");
  const initialSource = filteredLocations.find((v) => v.id === "assethub");
  const initialDestination = filteredLocations.find((v) => v.id === "rilt");
  const form: UseFormReturn<FormDataSwitch> = useForm<
    z.infer<typeof formSchemaSwitch>
  >({
    resolver: zodResolver(formSchemaSwitch),
    defaultValues: {
      source: initialSource,
      destination: initialDestination,
      token: "",
      beneficiary: "",
      sourceAccount: "",
      amount: "0.0",
    },
  });

  const source = form.watch("source");
  const destination = form.watch("destination");
  const account = form.watch("sourceAccount");
  const amount = form.watch("amount");

  useEffect(() => {
    const handle = async () => {
      let balance: string;

      if (source.name === "assethub") {
        const { data } =
          await context?.polkadot.api.assetHub.query.system.account(account);
        balance = data.toHuman().free;
      } else if (source.name !== "assethub") {
        const { data } =
          await context?.polkadot.api.parachains[
            source.paraInfo?.paraId
          ].query.system.account(account);

        balance = data.toHuman().free;
        console.log(data.toHuman().free);
      }
      console.log(balance);
      const formattedBalance = formatBalance({
        number: balance,
        decimals: source.paraInfo!.decimals,
      });
      console.log("nope", formattedBalance);
      setBalanceDisplay(formattedBalance);
    };
    handle();
  }, [account, context, polkadotAccounts, source]);

  useEffect(() => {
    if (source && source.destinationIds.length > 0) {
      const newDestinationId = source.destinationIds[0];
      const currentDestination = form.getValues("destination");
      if (currentDestination?.id !== newDestinationId) {
        const selectedDestination = filteredLocations.find(
          (v) => v.id === newDestinationId,
        );
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

  const onSubmit = async (data: FormDataSwitch, context: Context) => {
    const { sourceAccount, source, destination, token, beneficiary } = data;
    if (!account) {
      console.log("no account");
      return;
    }
    if (!destination) {
      console.log("no account");
      return;
    }
    if (!source) {
      console.log("no account");
      return;
    }
    if (!context) {
      return;
    }
    if (!token) {
      return;
    }
    const tokenMetadata = await assets
      .assetErc20Metadata(context, token)
      .then((val) => val);
    let transaction;
    console.log(source.id);
    if (source.id === "assethub") {
      transaction = await submitAssetHubToParachainTransfer({
        context,
        beneficiary,
        source,
        destination,
        amount,
        tokenMetadata,
        setError,
        setBusyMessage,
      });
    } else {
      transaction = submitParachainToAssetHubTransfer({
        context,
        beneficiary,
        source,
        amount,
        tokenMetadata,
        setError,
        setBusyMessage,
      });
    }

    const { signer, address } = polkadotAccounts?.find(
      (val) => val.address === sourceAccount,
    )!;
    if (!signer) {
      return;
    }
    transaction.signAndSend(address, { signer });
  };

  const beneficiaries: AccountInfo[] = [];
  polkadotAccounts
    ?.map((x) => {
      return { key: x.address, name: x.name || "", type: destination.type };
    })
    .forEach((x) => beneficiaries.push(x));

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
              onSubmit={form.handleSubmit((data) => onSubmit(data, context!))}
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
                  <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token</FormLabel>
                        <FormControl>
                          <div className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            {source.name}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="text-sm text-right text-muted-foreground px-1">
                Transfer Fee: {""}
              </div>
              <br />
              <Button
                disabled={context === null}
                className="w-full my-8"
                type="submit"
              >
                Submit
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};
