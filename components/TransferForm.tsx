import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "./ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "./ui/select";
import { TransferFormData } from "@/utils/formSchema";
import { SubmitHandler, UseFormReturn } from "react-hook-form";
import { SelectAccount } from "./SelectAccount";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { FC, useState } from "react";
import { SelectedEthereumWallet } from "./SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { FeeDisplay } from "./FeeDisplay";
import { environment } from "@snowbridge/api";
import { BalanceDisplay } from "./BalanceDisplay";

interface TransferFormProps {
  form: UseFormReturn<TransferFormData>;
  onSubmit: SubmitHandler<TransferFormData>;
  environment: environment.SnowbridgeEnvironment;
}

export const TransferForm: FC<TransferFormProps> = ({
  form,
  onSubmit,
  environment,
}) => {
  const [source, setSource] = useState(environment.locations[0]);
  const [destinations, setDestinations] = useState(
    source.destinationIds.map(
      (d) => environment.locations.find((s) => d === s.id)!,
    ),
  );
  const [destination, setDestination] = useState(destinations[0]);

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
                    source={source.type}
                    ethereumAccount={ethereumAccount}
                    polkadotAccount={polkadotAccount}
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
