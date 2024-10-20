import { ethereumAccountsAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { TransferFormData } from "@/utils/formSchema";
import { AccountInfo } from "@/utils/types";
import { environment } from "@snowbridge/api";
import { WalletAccount } from "@talismn/connect-wallets";
import { useAtomValue } from "jotai";
import { FC, useEffect, useState } from "react";
import { SubmitHandler, UseFormReturn } from "react-hook-form";
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
  form: UseFormReturn<TransferFormData>;
  onSubmit: SubmitHandler<TransferFormData>;
}

export const TransferForm: FC<TransferFormProps> = ({ form, onSubmit }) => {
  const environment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);

  const [source, setSource] = useState(environment.locations[0]);
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

  const watchToken = form.watch("token");
  const watchSource = form.watch("source");
  const watchDestination = form.watch("destination");
  const watchSourceAccount = form.watch("sourceAccount");

  useEffect(() => {
    let newDestinations = destinations;
    if (source.id !== watchSource) {
      const newSource = environment.locations.find((s) => s.id == watchSource)!;
      setSource(newSource);
      newDestinations = newSource.destinationIds
        .map((d) => environment.locations.find((s) => d === s.id))
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
    environment,
    watchDestination,
    watchToken,
    setSource,
    setDestinations,
    setDestination,
    setToken,
  ]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
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
                    displayDecimals={8}
                    sourceAccount={watchSourceAccount}
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
          disabled={context === null}
          className="w-full my-8"
          type="submit"
        >
          {context === null ? "Connecting..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
};
