"use client";
import { FC, Key, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import {
  snowbridgeContextAtom,
} from "@/store/snowbridge";
import { useAtom, useAtomValue } from "jotai";
import {
  filterByAccountType,
  TransferFormData,
  transferFormSchema,
} from "@/utils/formSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { AccountInfo, AssetHub, ErrorInfo, KusamaValidationData } from "@/utils/types";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { useAssetRegistry } from "@/hooks/useAssetRegistry";
import { useSendKusamaToken } from "@/hooks/useSendTokenKusama";
import { parseUnits } from "ethers";
import { useKusamaFeeInfo } from "@/hooks/useKusamaFeeInfo";
import { toast } from "sonner";
import { SelectItemWithIcon } from "@/components/SelectItemWithIcon";
import { KusamaFeeDisplay } from "@/components/ui/KusamaFeeDisplay";
import { SendErrorDialog } from "@/components/SendErrorDialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SelectAccount } from "@/components/SelectAccount";
import { BusyDialog } from "./BusyDialog";
import { KusamaBalanceDisplay } from "@/components/KusamaBalanceDisplay";
import { ValidationError } from "jest-validate";
import { formatBalance } from "@/utils/formatting";

export const KusamaComponent: FC = () => {
  const router = useRouter();
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const { data: assetRegistry } = useAssetRegistry();

  const [error, setError] = useState<ErrorInfo | null>(null);
  const [busyMessage, setBusyMessage] = useState("");
  const [planSend, sendToken] = useSendKusamaToken();

  const form: UseFormReturn<TransferFormData> = useForm<
    z.infer<typeof transferFormSchema>
  >({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      source: AssetHub.Polkadot,
      destination: AssetHub.Kusama,
      token: "0x0000000000000000000000000000000000000000",
      amount: "0.0",
    },
  });

  const sourceId = form.watch("source");
  const destinationId = form.watch("destination");
  const beneficiary = form.watch("beneficiary");
  const amount = form.watch("amount");
  const watchSourceAccount = form.watch("sourceAccount");
  const watchToken = form.watch("token");
  const tokens =
    assetRegistry.kusama?.parachains[assetRegistry.kusama?.assetHubParaId]
      .assets;
  const { data: feeInfo, error: _ } = useKusamaFeeInfo(sourceId);

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
    if (sourceId === AssetHub.Polkadot && destinationId !== AssetHub.Kusama) {
      form.setValue("destination", AssetHub.Kusama);
    } else if (
      sourceId === AssetHub.Kusama &&
      destinationId !== AssetHub.Polkadot
    ) {
      form.setValue("destination", AssetHub.Polkadot);
    }
  }, [sourceId, destinationId, form, tokens]);

  const onSubmit = useCallback(async () => {
    try {
      if (feeInfo === undefined) {
        setError({
          title: "Fee Info Error",
          description: `Fee info could not be found`,
          errors: [],
        });
        return;
      }

      if (watchToken === undefined) {
        setError({
          title: "Token error",
          description: `Please select a token`,
          errors: [],
        });
        return;
      }

      if (tokens === undefined) {
        setError({
          title: "Token error",
          description: `Token to be sent could not be found.`,
          errors: [],
        });
        return;
      }

      let asset =
        assetRegistry.ethereumChains?.[assetRegistry.ethChainId]?.assets?.[
          watchToken
        ];

      // Fallback to parachain metadata if decimals are missing or empty
      if (!asset?.decimals || asset.decimals === 0) {
        asset = tokens?.[watchToken];
      }

      if (asset === undefined) {
        setError({
          title: "Asset error",
          description: `Asset to transfer could not be found in metadata.`,
          errors: [],
        });
        return;
      }

      let amountInSmallestUnit = parseUnits(amount, asset.decimals);
      if (amountInSmallestUnit === 0n) {
        setError({
          title: "Amount not specified",
          description: `Please specify an amount.`,
          errors: [],
        });
        return;
      }

      let data: KusamaValidationData = {
        source: sourceId,
        destination: destinationId,
        sourceAccount: watchSourceAccount,
        beneficiary,
        token: watchToken,
        assetRegistry: assetRegistry,
        tokenMetadata: tokens[watchToken],
        amountInSmallestUnit: amountInSmallestUnit,
        fee: {
          fee: feeInfo.fee,
          decimals: asset.decimals,
          symbol: asset.symbol,
          delivery: {
            totalFeeInDot: feeInfo.fee,
            xcmBridgeFee: 0n,
            bridgeHubDeliveryFee: 0n,
          },
        },
      };

      console.log("feeInfo", feeInfo);
      console.log("beneficiary", beneficiary);
      console.log("data", data);

      setBusyMessage("Validating transaction");
      const plan = await planSend(data);
      setBusyMessage("");

      console.log("plan", plan);
      if (!plan.success) {
        let errors: ValidationError[] = [];
        for (const planLog of plan.logs) {
          errors.push(planLog);
        }
        setError({
          title: "Validation Errors",
          description: `Errors were found during transaction validation`,
          errors: errors,
        });
        return;
      }

      if (asset.symbol === "DOT") {
        let totalFee =
          feeInfo.fee +
          plan.data.sourceExecutionFee +
          data.amountInSmallestUnit;
        if (totalFee > plan.data.dotBalance) {
          let formattedTotalFee = formatBalance({
            number: totalFee,
            decimals: 10,
          });
          setError({
            title: "DOT balance too low",
            description: `DOT balance should be at least ${formattedTotalFee} to cover the DOT token transfer, delivery and extrinsic fee`,
            errors: [],
          });
          return;
        }
      } else {
        let totalFee = feeInfo.fee + plan.data.sourceExecutionFee;
        if (totalFee > plan.data.dotBalance) {
          let formattedTotalFee = formatBalance({
            number: totalFee,
            decimals: 10,
          });
          setError({
            title: "DOT balance too low",
            description: `DOT balance should be at least ${formattedTotalFee} to cover delivery and extrinsic fee`,
            errors: [],
          });
          return;
        }
      }

      setBusyMessage("Sending transaction");
      const result = await sendToken(data, plan);
      console.log("result", result);

      const subscanHost =
        sourceId === AssetHub.Polkadot
          ? "https://assethub-polkadot.subscan.io"
          : "https://assethub-kusama.subscan.io";
      if (result.success && !result.dispatchError) {
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
        router.push("/history");
      } else if (!result.success || result.dispatchError) {
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
    } catch (err) {
      setBusyMessage("");
      setError({
        title: "Transaction Failed",
        description: `Error occurred while trying to send transaction.`,
        errors: [],
      });
    }
  }, [
    context,
    sourceId,
    destinationId,
    watchToken,
    watchSourceAccount,
    beneficiary,
    amount,
    feeInfo,
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
                                key={AssetHub.Polkadot}
                                value={AssetHub.Polkadot}
                              >
                                <SelectItemWithIcon
                                  label="Polkadot Asset Hub"
                                  image="assethubpolkadot"
                                />
                              </SelectItem>
                              <SelectItem
                                key={AssetHub.Kusama}
                                value={AssetHub.Kusama}
                              >
                                <SelectItemWithIcon
                                  label="Kusama Asset Hub"
                                  image="assethubkusama"
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
                              {sourceId !== AssetHub.Polkadot ? (
                                <SelectItem
                                  key={AssetHub.Polkadot}
                                  value={AssetHub.Polkadot}
                                >
                                  <SelectItemWithIcon
                                    label="Polkadot Asset Hub"
                                    image="assethubpolkadot"
                                  />
                                </SelectItem>
                              ) : (
                                <SelectItem
                                  key={AssetHub.Kusama}
                                  value={AssetHub.Kusama}
                                >
                                  <SelectItemWithIcon
                                    label="Kusama Asset Hub"
                                    image="assethubkusama"
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
                        <div className={"flex flex-row-reverse"}>
                          <KusamaBalanceDisplay
                            source={sourceId}
                            sourceAccount={watchSourceAccount}
                            token={watchToken}
                            displayDecimals={8}
                          />
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
                        destination={destinationId}
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
                                {Object.values(tokens ?? {}).map((t) => {
                                  const assetId = t.token?.toLowerCase();
                                  const asset =
                                    assetId &&
                                    assetRegistry.ethereumChains?.[
                                      assetRegistry.ethChainId
                                    ]?.assets?.[assetId];
                                  // Skip rendering if asset or assetId is missing
                                  if (!assetId || !asset) return null;

                                  return (
                                    <SelectItem key={assetId} value={assetId}>
                                      <SelectItemWithIcon
                                        label={asset.name}
                                        image={asset.symbol}
                                        altImage="token_generic"
                                      />
                                    </SelectItem>
                                  );
                                })}
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
              <div className="text-sm text-center text-muted-foreground px-1 mt-1">
                Delivery Fee:{" "}
                <KusamaFeeDisplay
                  className="inline"
                  source={sourceId}
                  destination={destinationId}
                  token={watchToken}
                  displayDecimals={8}
                />
              </div>
              <br />
              <Button className="w-full my-8 action-button" type="submit">
                Submit
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <BusyDialog
        open={busyMessage !== ""}
        description={busyMessage}
        dismiss={() => setBusyMessage("")}
      />
      <SendErrorDialog
        info={error}
        formData={form.getValues()}
        dismiss={() => setError(null)}
      />
    </>
  );
};
