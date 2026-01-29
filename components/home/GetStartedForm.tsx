import { FC, useEffect, useMemo, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "../ui/button";
import Link from "next/link";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { fetchTokenPrices } from "@/utils/coindesk";
import { zodResolver } from "@hookform/resolvers/zod";
import { SelectItemWithIcon } from "../SelectItemWithIcon";
import { TokenSelector } from "../TokenSelector";
import { ArrowRight, LucideAlertCircle } from "lucide-react";
import {
  AssetRegistry,
  Source,
  TransferLocation,
  TransferRoute,
} from "@snowbridge/base-types";
import {
  getTransferLocation,
  getTransferLocations,
} from "@snowbridge/registry";
import { z } from "zod";
import { formatUsdValue } from "@/utils/formatting";

interface GetStartedFormProps {
  routes: readonly TransferRoute[];
  assetRegistry: AssetRegistry;
}

export const getStartedSchema = z.object({
  source: z.string().min(1, "Select source."),
  destination: z.string().min(1, "Select destination."),
  token: z.string().min(1, "Select token."),
  amount: z
    .string()
    .regex(
      /^([1-9][0-9]{0,37})|([0-9]{0,37}\.+[0-9]{0,18})$/,
      "Invalid amount",
    ),
});

export type GetStartedZodForm = z.infer<typeof getStartedSchema>;

type FormParams = {
  form: UseFormReturn<GetStartedZodForm, any, undefined>;
  destinations: TransferLocation[];
  source: Source;
  locations: Source[];
  assetRegistry: AssetRegistry;
  setSource: any;
  setDestination: any;
  setDestinations: any;
  setToken: any;
};

function setFormParams(
  params: FormParams,
  wsource: string,
  wdestination: string,
  wtoken: string,
) {
  const {
    destinations,
    source,
    locations,
    assetRegistry,
    form,
    setSource,
    setDestinations,
    setDestination,
    setToken,
  } = params;
  let newDestinations = destinations;
  let newSource = source;
  if (source.key !== wsource) {
    newSource = locations.find((s) => s.key === wsource)!;
    setSource(newSource);
    newDestinations = Object.values(newSource.destinations).map((destination) =>
      getTransferLocation(assetRegistry, destination),
    );
    setDestinations(newDestinations);
  }
  const newDestination =
    newDestinations.find((d) => d.key == wdestination) ?? newDestinations[0];
  setDestination(newDestination);
  form.resetField("destination", { defaultValue: newDestination.key });

  const newTokens = newSource.destinations[newDestination.key].assets;
  const newToken =
    newTokens.find((x) => x.toLowerCase() == wtoken.toLowerCase()) ??
    newTokens[0];
  setToken(newToken);
  form.resetField("token", { defaultValue: newToken });
}

export const GetStartedForm: FC<GetStartedFormProps> = ({
  assetRegistry,
  routes,
}) => {
  const locations = useMemo(() => getTransferLocations(routes), [routes]);

  const firstSource =
    locations.find(
      (l) => l.kind === "ethereum" && l.id === assetRegistry.ethChainId,
    ) ?? locations[0];
  const firstDestinations = Object.values(firstSource.destinations).map((d) =>
    getTransferLocation(assetRegistry, d),
  );
  const firstDestination =
    firstDestinations.find(
      (d) => d.kind === "polkadot" && d.id === assetRegistry.assetHubParaId,
    ) ?? firstDestinations[0];
  const firstTokens = firstSource.destinations[firstDestination.key].assets;
  const firstToken =
    firstTokens.find((a) =>
      assetRegistry.ethereumChains[
        `ethereum_${assetRegistry.ethChainId}`
      ].assets[a].symbol.match(/ETH/),
    ) ?? firstTokens[0];

  const [source, setSource] = useState(firstSource);
  const [destinations, setDestinations] = useState(firstDestinations);
  const [destination, setDestination] = useState(firstDestination);
  const [token, setToken] = useState(firstToken);

  const form = useForm<GetStartedZodForm>({
    resolver: zodResolver(getStartedSchema),
    defaultValues: {
      source: source.key,
      destination: destination.key,
      token: token,
      amount: "0.0",
    },
  });

  const watchToken = form.watch("token");
  const watchSource = form.watch("source");
  const watchDestination = form.watch("destination");
  const watchAmount = form.watch("amount");
  const [amountUsdValue, setAmountUsdValue] = useState<string | null>(null);

  useEffect(() => {
    setFormParams(
      {
        assetRegistry,
        setDestination,
        setDestinations,
        locations,
        destinations,
        form,
        setSource,
        setToken,
        source,
      },
      watchSource,
      watchDestination,
      watchToken,
    );
  }, [
    assetRegistry,
    destinations,
    form,
    locations,
    source,
    watchDestination,
    watchSource,
    watchToken,
  ]);

  const tokenMetadata =
    assetRegistry.ethereumChains[`ethereum_${assetRegistry.ethChainId}`].assets[
      token.toLowerCase()
    ];

  // Calculate USD value for amount
  useEffect(() => {
    if (!watchAmount || !tokenMetadata || Number(watchAmount) === 0) {
      setAmountUsdValue(null);
      return;
    }

    const calculateUsd = async () => {
      try {
        const prices = await fetchTokenPrices([tokenMetadata.symbol]);
        const price = prices[tokenMetadata.symbol.toUpperCase()];
        if (price) {
          const usdAmount = Number(watchAmount) * price;
          setAmountUsdValue(`≈ $${formatUsdValue(usdAmount)}`);
        } else {
          setAmountUsdValue(null);
        }
      } catch {
        setAmountUsdValue(null);
      }
    };

    calculateUsd();
  }, [watchAmount, tokenMetadata]);

  return (
    <Form {...form}>
      <form className="space-y-2">
        <div className="mt-5 flex flex-row items-center justify-between gap-1 sm:gap-3">
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem className="flex-1 min-w-0">
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="border-0 bg-transparent hover:bg-white/20 transition-colors dropdown-shadow px-2 sm:px-3">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {locations.map((s) => {
                          const loc = getTransferLocation(assetRegistry, s);
                          return (
                            <SelectItem key={s.key} value={s.key}>
                              <SelectItemWithIcon
                                label={loc.name}
                                image={s.key}
                                altImage="parachain_generic"
                              />
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

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full bg-white/[0.28] hover:bg-white/40 p-1.5 sm:p-2 h-auto flex-shrink-0"
            onClick={() => {
              setFormParams(
                {
                  assetRegistry,
                  setDestination,
                  setDestinations,
                  locations,
                  destinations,
                  form,
                  setSource,
                  setToken,
                  source,
                },
                watchDestination, // Source
                watchSource, // Destination
                watchToken,
              );
            }}
          >
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>

          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem className="flex-1 min-w-0">
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="border-0 bg-transparent hover:bg-white/20 transition-colors dropdown-shadow px-2 sm:px-3">
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {destinations.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            <SelectItemWithIcon
                              label={s.name}
                              image={s.key}
                              altImage="parachain_generic"
                            />
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
        <div className="transfer-spacing"></div>
        <div>
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormControl>
                  <div className="amountContainer flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full px-3 py-3">
                    <div className="flex-1 flex flex-col min-w-0">
                      <input
                        className="amountInput p2 text-left text-2xl sm:text-3xl font-medium bg-transparent border-0 outline-none placeholder:text-muted-foreground"
                        type="string"
                        placeholder="0.0"
                        {...field}
                      />
                      {amountUsdValue && (
                        <div className="text-sm text-muted-foreground pl-2">
                          {amountUsdValue}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        type="button"
                        variant={"clean"}
                        className="h-7 px-3 py-1 text-xs flex-shrink-0 rounded-full border-0 glass-pill"
                        disabled={true}
                      >
                        Max
                      </Button>
                      <FormField
                        control={form.control}
                        name="token"
                        render={({ field }) => (
                          <FormItem className="flex-shrink-0">
                            <FormControl>
                              <TokenSelector
                                value={field.value}
                                onChange={field.onChange}
                                assets={
                                  source.destinations[destination.key].assets
                                }
                                assetRegistry={assetRegistry}
                                ethChainId={assetRegistry.ethChainId}
                                source={getTransferLocation(
                                  assetRegistry,
                                  source,
                                )}
                                destination={destination}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </FormControl>
                {form.formState.errors.amount && (
                  <div className="w-full rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <LucideAlertCircle className="text-red-800 dark:text-red-200 flex-shrink-0 mt-0.5 w-4 h-4" />
                      <span className="text-sm text-red-800 dark:text-red-200">
                        {form.formState.errors.amount.message}
                      </span>
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />
        </div>
        <div className="transfer-spacing"></div>
        <Link
          href={`/send?source=${encodeURIComponent(watchSource)}&destination=${encodeURIComponent(watchDestination)}&token=${encodeURIComponent(watchToken)}&amount=${encodeURIComponent(watchAmount || "")}`}
        >
          <div className="flex flex-col items-center">
            <Button className="w-full action-button">Get Started</Button>
          </div>
        </Link>
      </form>
    </Form>
  );
};
