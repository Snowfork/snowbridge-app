"use client";

import { useTransferHistory } from "@/hooks/useTransferHistory";
import { formatBalance } from "@/utils/formatting";
import {
  ethereumAccountAtom,
  ethereumAccountsAtom,
  ethereumChainIdAtom,
  ethersProviderAtom,
} from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import {
  assetErc20MetaDataAtom,
  relayChainNativeAssetAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { transfersPendingLocalAtom } from "@/store/transferHistory";
import { zodResolver } from "@hookform/resolvers/zod";
import { assets, environment, toEthereum, toPolkadot } from "@snowbridge/api";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { FC, useCallback, useEffect, useState } from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BusyDialog } from "./BusyDialog";
import { SelectedEthereumWallet } from "./SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { Button } from "./ui/button";
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
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { LucideHardHat } from "lucide-react";
import { track } from "@vercel/analytics";
import { formSchema } from "@/utils/formSchema";
import { SelectAccount } from "./SelectAccount";
import { SendErrorDialog } from "./SendErrorDialog";
import { errorMessage } from "@/utils/errorMessage";
import { updateBalance, parseAmount } from "@/utils/balances";

import { doApproveSpend } from "@/utils/doApproveSpend";
import { doDepositAndApproveWeth } from "@/utils/doDepositAndApproveWeth";
import { FormData, ErrorInfo, AccountInfo, AppRouter } from "@/utils/types";
import { onSubmit } from "@/utils/onSubmit";

export const validateOFAC = async (
  data: FormData,
  form: UseFormReturn<FormData>,
): Promise<boolean> => {
  const response = await fetch("/blocked/api", {
    method: "POST",
    body: JSON.stringify({
      sourceAddress: data.sourceAccount,
      beneficiaryAddress: data.beneficiary,
    }),
  });
  if (!response.ok) {
    throw Error(
      `Error verifying ofac status: ${response.status} - ${response.statusText}`,
    );
  }
  const result = await response.json();
  if (result.beneficiaryBanned) {
    form.setError(
      "beneficiary",
      { message: "Beneficiary banned." },
      { shouldFocus: true },
    );
  }
  if (result.sourceBanned) {
    form.setError(
      "sourceAccount",
      { message: "Source Account banned." },
      { shouldFocus: true },
    );
  }
  return result.beneficiaryBanned === false && result.sourceBanned === false;
};

export const TransferComponent: FC = () => {
  const maintenance =
    (process.env.NEXT_PUBLIC_SHOW_MAINTENANCE ?? "false")
      .toLowerCase()
      .trim() === "true";

  if (maintenance)
    return (
      <div className="flex-col gap-2">
        <div className="flex justify-center">
          <LucideHardHat />
        </div>
        <p>Under Maintenance: Check back soon!</p>
      </div>
    );
  return <TransferForm />;
};

export const TransferForm: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);
  const ethereumChainId = useAtomValue(ethereumChainIdAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const assetHubNativeToken = useAtomValue(relayChainNativeAssetAtom);
  const assetErc20MetaData = useAtomValue(assetErc20MetaDataAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const appRouter = useRouter();

  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);

  const { mutate: refreshHistory } = useTransferHistory();

  const transfersPendingLocal = useSetAtom(transfersPendingLocalAtom);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [busyMessage, setBusyMessage] = useState("");
  const [source, setSource] = useState(snowbridgeEnvironment.locations[0]);
  const [sourceAccount, setSourceAccount] = useState<string>();
  const [destinations, setDestinations] = useState(
    source.destinationIds.map(
      (d) => snowbridgeEnvironment.locations.find((s) => d === s.id)!,
    ),
  );
  const [destination, setDestination] = useState(destinations[0]);

  const [token, setToken] = useState(
    destination.erc20tokensReceivable[0].address,
  );
  const [tokenMetadata, setTokenMetadata] =
    useState<assets.ERC20Metadata | null>(null);
  const [feeDisplay, setFeeDisplay] = useState<string>("Fetching...");
  const [balanceDisplay, setBalanceDisplay] = useState<string>("Fetching...");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: source.id,
      destination: destination.id,
      token: token,
      beneficiary: "",
      sourceAccount: sourceAccount,
      amount: "0.0",
    },
  });

  useEffect(() => {
    if (context == null) return;
    switch (source.type) {
      case "substrate": {
        toEthereum
          .getSendFee(context)
          .then((fee) => {
            setFeeDisplay(
              formatBalance({
                number: fee,
                decimals: assetHubNativeToken?.tokenDecimal ?? 0,
              }) +
                " " +
                assetHubNativeToken?.tokenSymbol,
            );
          })
          .catch((err) => {
            console.error(err);
            setFeeDisplay("unknown");
            setError({
              title: "Error",
              description: "Could not fetch transfer fee.",
              errors: [],
            });
          });
        break;
      }
      case "ethereum": {
        if (destination.paraInfo === undefined) {
          setFeeDisplay("unknown");
          setError({
            title: "Error",
            description: "Destination fee is not configured.",
            errors: [],
          });
          break;
        }

        toPolkadot
          .getSendFee(
            context,
            token,
            destination.paraInfo.paraId,
            destination.paraInfo.destinationFeeDOT,
          )
          .then((fee) => {
            setFeeDisplay(
              formatBalance({ number: fee, decimals: 18 }) + " ETH",
            );
          })
          .catch((err) => {
            console.error(err);
            setFeeDisplay("unknown");
            setError({
              title: "Error",
              description: "Could not fetch transfer fee.",
              errors: [],
            });
          });
        break;
      }
      default:
        setError({
          title: "Error",
          description: "Could not fetch transfer fee.",
          errors: [],
        });
    }
  }, [
    context,
    source,
    destination,
    token,
    setFeeDisplay,
    setError,
    assetHubNativeToken,
  ]);

  const watchToken = form.watch("token");
  const watchSource = form.watch("source");
  const watchDestination = form.watch("destination");

  useEffect(() => {
    let newDestinations = destinations;
    if (source.id !== watchSource) {
      const newSource = snowbridgeEnvironment.locations.find(
        (s) => s.id == watchSource,
      )!;
      setSource(newSource);
      newDestinations = newSource.destinationIds
        .map((d) => snowbridgeEnvironment.locations.find((s) => d === s.id))
        .filter((s) => s !== undefined)
        .map((s) => s!);
      setDestinations(newDestinations);
    }
    const newDestination =
      newDestinations.find((d) => d.id == watchDestination) ??
      newDestinations[0];
    setDestination(newDestination);
    form.resetField("destination", { defaultValue: newDestination.id });
    form.resetField("beneficiary", { defaultValue: "" });

    const newTokens = newDestination.erc20tokensReceivable;
    const newToken =
      newTokens.find(
        (x) => x.address.toLowerCase() == watchToken.toLowerCase(),
      ) ?? newTokens[0];
    setToken(newToken.address);
    form.resetField("token", { defaultValue: newToken.address });
  }, [
    form,
    source,
    destinations,
    watchSource,
    snowbridgeEnvironment,
    watchDestination,
    watchToken,
    setSource,
    setDestinations,
    setDestination,
    setToken,
  ]);

  useEffect(() => {
    if (context == null) return;
    if (assetErc20MetaData !== null && assetErc20MetaData[token]) {
      setTokenMetadata(assetErc20MetaData[token]);
      return;
    }

    assets
      .assetErc20Metadata(context, token)
      .then((metadata) => {
        setTokenMetadata(metadata);
      })
      .catch((err) => {
        console.error(err);
        setTokenMetadata(null);
        setError({
          title: "Error",
          description: `Token metadata unavailable.`,
          errors: [],
        });
      });
  }, [context, token, setTokenMetadata, assetErc20MetaData]);

  const watchSourceAccount = form.watch("sourceAccount");

  useEffect(() => {
    const newSourceAccount =
      source.type == "ethereum"
        ? (ethereumAccount ?? undefined)
        : polkadotAccount?.address;
    setSourceAccount(newSourceAccount);
    form.resetField("sourceAccount", { defaultValue: newSourceAccount });

    if (
      context == null ||
      newSourceAccount === undefined ||
      ethereumChainId == null ||
      token === "" ||
      tokenMetadata == null
    )
      return;
    updateBalance(
      context,
      ethereumChainId,
      source,
      newSourceAccount,
      token,
      tokenMetadata,
      setBalanceDisplay,
      setError,
    );
  }, [
    form,
    watchSourceAccount,
    source,
    ethereumAccount,
    polkadotAccount,
    setSourceAccount,
    token,
    context,
    ethereumChainId,
    tokenMetadata,
  ]);

  const depositAndApproveWeth = useCallback(async () => {
    if (
      tokenMetadata == null ||
      context == null ||
      ethereumChainId == null ||
      sourceAccount == undefined
    ) {
      return;
    }
    const toastTitle = "Deposit and Approve Token Spend";
    setBusyMessage("Depositing and approving spend...");
    try {
      const formData = form.getValues();
      track("Deposit And Approve", formData);
      await doDepositAndApproveWeth(
        context,
        ethereumProvider,
        formData.token,
        parseAmount(formData.amount, tokenMetadata),
      );
      toast.info(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        id: "deposit_approval_result",
        description: "Token spend allowance approval was succesful.",
        important: true,
      });
      updateBalance(
        context,
        ethereumChainId,
        source,
        sourceAccount,
        token,
        tokenMetadata,
        setBalanceDisplay,
        setError,
      );
      track("Deposit And Approve Success", formData);
    } catch (err: any) {
      console.error(err);
      const formData = form.getValues();
      const message = `Token spend allowance approval failed.`;
      track("Deposit And Approve Failed", {
        ...formData,
        message: errorMessage(err),
      });
      toast.error(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        duration: 20000,
        id: "deposit_approval_result",
        description: message,
        important: true,
      });
    } finally {
      setBusyMessage("");
      setError(null);
    }
  }, [
    context,
    ethereumProvider,
    form,
    setBusyMessage,
    setError,
    tokenMetadata,
    sourceAccount,
    setBalanceDisplay,
    token,
    ethereumChainId,
    source,
  ]);

  const approveSpend = useCallback(async () => {
    if (
      tokenMetadata == null ||
      context == null ||
      ethereumChainId == null ||
      sourceAccount == undefined
    )
      return;
    const toastTitle = "Approve Token Spend";
    setBusyMessage("Approving spend...");
    try {
      const formData = form.getValues();
      track("Approve Spend", formData);
      await doApproveSpend(
        context,
        ethereumProvider,
        formData.token,
        parseAmount(formData.amount, tokenMetadata),
      );
      toast.info(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        id: "approval_result",
        description: "Token spend allowance approval was succesful.",
        important: true,
      });
      updateBalance(
        context,
        ethereumChainId,
        source,
        sourceAccount,
        token,
        tokenMetadata,
        setBalanceDisplay,
        setError,
      );
      track("Approve Spend Success", formData);
    } catch (err: any) {
      console.error(err);
      const formData = form.getValues();
      const message = `Token spend allowance approval failed.`;
      track("Approve Spend Success", {
        ...formData,
        message: errorMessage(err),
      });
      toast.error(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        duration: 20000,
        id: "approval_result",
        description: message,
        important: true,
      });
    } finally {
      setBusyMessage("");
      setError(null);
    }
  }, [
    context,
    ethereumProvider,
    form,
    setBusyMessage,
    setError,
    sourceAccount,
    setBalanceDisplay,
    token,
    ethereumChainId,
    source,
    tokenMetadata,
  ]);

  const beneficiaries: AccountInfo[] = [];
  if (
    destination.type === "substrate" &&
    (destination.paraInfo?.addressType === "32byte" ||
      destination.paraInfo?.addressType === "both")
  ) {
    polkadotAccounts
      ?.map((x) => {
        return { key: x.address, name: x.name || "", type: destination.type };
      })
      .forEach((x) => beneficiaries.push(x));
  }
  if (
    destination.type === "ethereum" ||
    destination.paraInfo?.addressType === "20byte" ||
    destination.paraInfo?.addressType === "both"
  ) {
    ethereumAccounts
      ?.map((x) => {
        return { key: x, name: x, type: "ethereum" as environment.SourceType };
      })
      .forEach((x) => beneficiaries.push(x));

    polkadotAccounts
      ?.filter((x: any) => x.type === "ethereum")
      .map((x) => {
        return {
          key: x.address,
          name: `${x.name} (${x.source})` || "",
          type: destination.type,
        };
      })
      .forEach((x) => beneficiaries.push(x));
  }

  return (
    <>
      <Card className="w-auto md:w-2/3">
        <CardHeader>
          <CardTitle>Transfer</CardTitle>
          <CardDescription className="hidden md:flex">
            Transfer tokens between Ethereum and Polkadot parachains.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                onSubmit({
                  context,
                  source,
                  destination,
                  setError,
                  setBusyMessage,
                  polkadotAccount,
                  ethereumAccount,
                  ethereumProvider,
                  tokenMetadata,
                  appRouter,
                  form,
                  refreshHistory,
                  addPendingTransaction: transfersPendingLocal,
                }),
              )}
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
                              {snowbridgeEnvironment.locations
                                .filter((s) => s.destinationIds.length > 0)
                                .map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
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
                              {destinations.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
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
                        {source.type == "ethereum" ? (
                          <SelectedEthereumWallet />
                        ) : (
                          <SelectedPolkadotAccount />
                        )}
                        <div
                          className={
                            "text-sm text-right text-muted-foreground px-1 " +
                            ((source.type == "ethereum" &&
                              ethereumAccount !== null) ||
                            (source.type == "substrate" &&
                              polkadotAccount !== null)
                              ? " visible"
                              : " hidden")
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
                        <FormLabel className="invisible">Token</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a token" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {destination.erc20tokensReceivable.map((t) => (
                                  <SelectItem key={t.address} value={t.address}>
                                    {t.id}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                            <FormMessage />
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="text-sm text-right text-muted-foreground px-1">
                Transfer Fee: {feeDisplay}
              </div>
              <br />
              <Button
                disabled={context === null || tokenMetadata === null}
                className="w-full my-8"
                type="submit"
              >
                {context === null ? "Connecting..." : "Submit"}
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
        onDepositAndApproveWeth={depositAndApproveWeth}
        onApproveSpend={approveSpend}
        dismiss={() => setError(null)}
      />
    </>
  );
};
