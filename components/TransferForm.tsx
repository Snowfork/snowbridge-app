import { ethereumAccountAtom, ethereumAccountsAtom } from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import {
  assetErc20MetaDataAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { TransferFormData, transferFormSchema } from "@/utils/formSchema";
import { AccountInfo } from "@/utils/types";
import { environment } from "@snowbridge/api";
import { WalletAccount } from "@talismn/connect-wallets";
import { useAtomValue } from "jotai";
import { FC, useCallback, useEffect, useState } from "react";
import { SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { BalanceDisplay } from "./BalanceDisplay";
import { FeeDisplay } from "./FeeDisplay";
import { SelectAccount } from "./SelectAccount";
import { SelectedEthereumWallet } from "./SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { Button } from "./ui/button";
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
import { track } from "@vercel/analytics";
import { validateOFAC } from "@/utils/validateOFAC";
import { parseUnits } from "ethers";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatBalance } from "@/utils/formatting";

function getBeneficiaries(
  destination: environment.TransferLocation,
  polkadotAccounts: WalletAccount[],
  ethereumAccounts: string[],
) {
  const beneficiaries: AccountInfo[] = [];
  if (
    destination.type === "substrate" &&
    (destination.paraInfo?.addressType === "32byte" ||
      destination.paraInfo?.addressType === "both")
  ) {
    polkadotAccounts
      .map((x) => {
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
        return {
          key: x,
          name: x,
          type: "ethereum" as environment.SourceType,
        };
      })
      .forEach((x) => beneficiaries.push(x));

    polkadotAccounts
      .filter((x: any) => x.type === "ethereum")
      .map((x) => {
        return {
          key: x.address,
          name: `${x.name} (${x.source})` || "",
          type: destination.type,
        };
      })
      .forEach((x) => beneficiaries.push(x));
  }

  return beneficiaries;
}

interface TransferFormProps {
  onValidated: SubmitHandler<TransferFormData>;
  onMessage: (message: string) => Promise<unknown> | unknown;
  onError: (error: unknown) => Promise<unknown> | unknown;
}

export const TransferForm: FC<TransferFormProps> = ({
  onValidated,
  onMessage,
  onError,
}) => {
  const environment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const assetErc20MetaData = useAtomValue(assetErc20MetaDataAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);

  const [source, setSource] = useState(environment.locations[0]);
  const [sourceAccount, setSourceAccount] = useState<string>();
  const [destinations, setDestinations] = useState(
    source.destinationIds.map(
      (d) => environment.locations.find((s) => d === s.id)!,
    ),
  );
  const [destination, setDestination] = useState(destinations[0]);
  const [token, setToken] = useState(
    destination.erc20tokensReceivable[0].address,
  );

  const beneficiaries = getBeneficiaries(
    destination,
    polkadotAccounts ?? [],
    ethereumAccounts,
  );

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      source: source.id,
      destination: destination.id,
      token: token,
      beneficiary: "",
      sourceAccount: sourceAccount,
      amount: "0.0",
    },
  });

  const watchToken = form.watch("token");
  const watchSource = form.watch("source");
  const watchDestination = form.watch("destination");
  const watchSourceAccount = form.watch("sourceAccount");

  useEffect(() => {
    const newSourceAccount =
      source.type == "ethereum"
        ? (ethereumAccount ?? undefined)
        : polkadotAccount?.address;
    setSourceAccount(newSourceAccount);
    form.resetField("sourceAccount", { defaultValue: newSourceAccount });

    let newDestinations = destinations;
    if (source.id !== watchSource) {
      const newSource = environment.locations.find((s) => s.id == watchSource)!;
      setSource(newSource);
      newDestinations = newSource.destinationIds
        .map((d) => environment.locations.find((s) => d === s.id))
        .filter((s) => s !== undefined)
        .map((s) => s!);
      setDestinations(newDestinations);
      form.resetField("beneficiary", { defaultValue: "" });
    }
    const newDestination =
      newDestinations.find((d) => d.id == watchDestination) ??
      newDestinations[0];
    setDestination(newDestination);
    form.resetField("destination", { defaultValue: newDestination.id });

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
    environment,
    watchDestination,
    watchToken,
    setSource,
    setDestinations,
    setDestination,
    setToken,
    ethereumAccount,
    polkadotAccount?.address,
  ]);

  const tokenMetadata = assetErc20MetaData
    ? assetErc20MetaData[token.toLowerCase()]
    : null;

  const submit = useCallback(
    async (formData: TransferFormData) => {
      onMessage("Validating...");
      track("Validate Send", formData);
      try {
        if (tokenMetadata == null) throw Error(`No erc20 token metadata.`);

        const amountInSmallestUnit = parseUnits(
          formData.amount,
          tokenMetadata.decimals,
        );
        if (amountInSmallestUnit === 0n) {
          const errorMessage = "Amount must be greater than 0.";
          form.setError("amount", { message: errorMessage });
          return;
        }

        const minimumTransferAmount =
          destination.erc20tokensReceivable.find(
            (t) => t.address.toLowerCase() === formData.token.toLowerCase(),
          )?.minimumTransferAmount ?? 1n;
        if (amountInSmallestUnit < minimumTransferAmount) {
          const errorMessage = `Cannot send less than minimum value of ${formatBalance(
            {
              number: minimumTransferAmount,
              decimals: Number(tokenMetadata.decimals.toString()),
            },
          )} ${tokenMetadata.symbol}.`;
          form.setError(
            "amount",
            {
              message: errorMessage,
            },
            { shouldFocus: true },
          );
          track("Validate Failed", { ...formData, errorMessage });
          return;
        }

        if (!(await validateOFAC(formData, form))) {
          track("OFAC Validation.", formData);
          return;
        }

        if (source.id !== formData.source)
          throw Error(
            `Invalid form state: source mismatch ${source.id} and ${formData.source}.`,
          );
        if (destination.id !== formData.destination)
          throw Error(
            `Invalid form state: source mismatch ${destination.id} and ${formData.destination}.`,
          );
        if (context === null) throw Error(`Context not connected.`);
      } catch (err: any) {
        console.error(err);
        await onError(err);
      }
      await onValidated(formData);
    },
    [
      context,
      destination.erc20tokensReceivable,
      destination.id,
      form,
      onValidated,
      onError,
      onMessage,
      source.id,
      tokenMetadata,
    ],
  );
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-2">
        <div className="grid grid-cols-2 space-x-2">
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem {...field}>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {environment.locations
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <BalanceDisplay
                    source={source}
                    token={token}
                    tokenMetadata={tokenMetadata}
                    displayDecimals={8}
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
                  destination={destination.id}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
        <FeeDisplay
          source={source.type}
          destination={destination}
          token={token}
          displayDecimals={8}
        />
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
  );
};
