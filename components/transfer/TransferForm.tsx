import { ethereumAccountAtom, ethereumAccountsAtom } from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { TransferFormData, transferFormSchema } from "@/utils/formSchema";
import { AccountInfo, Destination, ValidationData } from "@/utils/types";
import { assets, assetsV2, Context, environment } from "@snowbridge/api";
import { WalletAccount } from "@talismn/connect-wallets";
import { useAtomValue } from "jotai";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { BalanceDisplay } from "../BalanceDisplay";
import { FeeDisplay } from "../FeeDisplay";
import { SelectAccount } from "../SelectAccount";
import { SelectedEthereumWallet } from "../SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "../SelectedPolkadotAccount";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { track } from "@vercel/analytics";
import { validateOFAC } from "@/utils/validateOFAC";
import { parseUnits } from "ethers";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatBalance } from "@/utils/formatting";
import { ConnectEthereumWalletButton } from "../ConnectEthereumWalletButton";
import { ConnectPolkadotWalletButton } from "../ConnectPolkadotWalletButton";
import { SelectItemWithIcon } from "../SelectItemWithIcon";
import { useAssetRegistry } from "@/hooks/useAssetRegistry";

function getBeneficiaries(
  destination: Destination,
  polkadotAccounts: WalletAccount[],
  ethereumAccounts: string[],
) {
  const beneficiaries: AccountInfo[] = [];
  if (destination.type === "substrate") {
    // TODO: SS58 conversion
    polkadotAccounts
      .filter(
        (x: any) =>
          (x.type === "ethereum" &&
            destination.parachain?.info.accountType === "AccountId20") ||
          (x.type !== "ethereum" &&
            destination.parachain?.info.accountType === "AccountId32"),
      )
      .map((x) => {
        return { key: x.address, name: x.name || "", type: destination.type };
      })
      .forEach((x) => beneficiaries.push(x));
  }
  if (
    destination.type === "ethereum" ||
    destination.parachain?.info.accountType === "AccountId20"
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
  onValidated: (data: ValidationData) => Promise<unknown> | unknown;
  onError: (form: TransferFormData, error: Error) => Promise<unknown> | unknown;
  formData?: TransferFormData;
}

function getDestination(
  source: assetsV2.Source,
  destination: string,
  registry: assetsV2.AssetRegistry,
): Destination {
  if (source.type === "ethereum") {
    const parachain = registry.parachains[destination];
    return {
      id: parachain.info.specName,
      name: parachain.info.name,
      key: destination,
      type: "substrate",
      parachain,
    };
  } else {
    const ethChain = registry.ethereumChains[destination];
    if (!ethChain.evmParachainId) {
      return {
        id: "ethereum",
        name: "Ethereum",
        type: "ethereum",
        key: destination,
        ethChain,
      };
    } else {
      const evmChain = registry.parachains[ethChain.evmParachainId];
      return {
        id: registry.ethereumChains[destination].id,
        name: `${evmChain.info.name} (EVM)`,
        key: destination,
        type: "ethereum",
        ethChain,
        parachain: evmChain,
      };
    }
  }
}

export const TransferForm: FC<TransferFormProps> = ({
  onValidated,
  onError,
  formData,
}) => {
  const environment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const { data: assetRegistry } = useAssetRegistry();

  const locations = useMemo(
    () =>
      assetsV2.getTransferLocations(assetRegistry, (path) => {
        // Disallow MYTH to any location but 3369
        if (
          path.asset === "0xba41ddf06b7ffd89d1267b5a93bfef2424eb2003" &&
          path.destination !== 3369
        ) {
          return false;
        }
        // Disallow MUSE to any location but 3369
        if (
          path.asset === "0xb34a6924a02100ba6ef12af1c798285e8f7a16ee" &&
          path.destination !== 3369
        ) {
          return false;
        }
        return true;
      }),
    [assetRegistry],
  );

  const firstSource = locations[0];
  const firstDestinations = Object.keys(firstSource.destinations).map(
    (destination) => getDestination(firstSource, destination, assetRegistry),
  );
  const firstDestination = firstDestinations[0];
  const ethAsset = Object.keys(
    assetRegistry.ethereumChains[assetRegistry.ethChainId].assets,
  ).find((asset) =>
    assetRegistry.ethereumChains[assetRegistry.ethChainId].assets[
      asset
    ].name.match(/Ether/),
  );
  const firstToken =
    ethAsset ?? firstSource.destinations[firstDestination.key][0];

  const [source, setSource] = useState(firstSource);
  const [sourceAccount, setSourceAccount] = useState<string>();
  const [destinations, setDestinations] = useState(firstDestinations);
  const [destination, setDestination] = useState(firstDestination);
  const [token, setToken] = useState(firstToken);
  const [validating, setValidating] = useState(false);

  const beneficiaries = getBeneficiaries(
    destination,
    polkadotAccounts ?? [],
    ethereumAccounts,
  );

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      source: formData?.source ?? source.id,
      destination: formData?.destination ?? destination.id,
      token: formData?.token ?? token,
      beneficiary: formData?.beneficiary,
      sourceAccount: formData?.sourceAccount ?? sourceAccount,
      amount: formData?.amount ?? "0.0",
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

    let newDestinations = destinations;
    let newSource = source;
    if (source.id !== watchSource) {
      newSource = locations.find((s) => s.id == watchSource)!;
      setSource(newSource);
      newDestinations = Object.keys(newSource.destinations).map(
        (destination) => {
          return getDestination(newSource, destination, assetRegistry);
        },
      );
      setDestinations(newDestinations);
    }
    const newDestination =
      newDestinations.find((d) => d.id == watchDestination) ??
      newDestinations[0];
    setDestination(newDestination);
    form.resetField("destination", { defaultValue: newDestination.id });

    const newTokens = newSource.destinations[newDestination.key];
    const newToken =
      newTokens.find((x) => x.toLowerCase() == watchToken.toLowerCase()) ??
      newTokens[0];
    setToken(newToken);
    form.resetField("token", { defaultValue: newToken });
    if (formData?.beneficiary) {
      form.resetField("beneficiary", {
        defaultValue: formData.beneficiary,
      });
      form.setValue("beneficiary", formData.beneficiary);
    }
  }, [
    destination.type,
    destinations,
    environment.locations,
    ethereumAccount,
    form,
    formData?.beneficiary,
    polkadotAccount?.address,
    source.id,
    source.type,
    watchDestination,
    watchSource,
    watchToken,
    watchSourceAccount,
    source,
    locations,
    assetRegistry,
  ]);

  const tokenMetadata =
    assetRegistry.ethereumChains[assetRegistry.ethChainId].assets[
      token.toLowerCase()
    ];

  const submit = useCallback(
    async (formData: TransferFormData) => {
      setValidating(true);
      track("Validate Send", formData);
      try {
        const amountInSmallestUnit = parseUnits(
          formData.amount,
          tokenMetadata.decimals,
        );
        if (amountInSmallestUnit === 0n) {
          const errorMessage = "Amount must be greater than 0.";
          form.setError("amount", { message: errorMessage });
          setValidating(false);
          return;
        }

        let minimumTransferAmount = 1n;
        if (destination.type === "substrate") {
          const ahMin =
            destination.parachain?.assets[formData.token.toLowerCase()]
              .minimumBalance ?? minimumTransferAmount;
          const dhMin =
            assetRegistry.parachains[assetRegistry.assetHubParaId].assets[
              formData.token.toLowerCase()
            ].minimumBalance;
          if (ahMin > minimumTransferAmount) minimumTransferAmount = ahMin;
          if (dhMin > minimumTransferAmount) minimumTransferAmount = dhMin;
        }
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
          setValidating(false);
          return;
        }

        if (!(await validateOFAC(formData, form))) {
          track("OFAC Validation.", formData);
          setValidating(false);
          return;
        }

        if (source.id !== formData.source) {
          throw Error(
            `Invalid form state: source mismatch ${source.id} and ${formData.source}.`,
          );
        }
        if (destination.id !== formData.destination) {
          throw Error(
            `Invalid form state: source mismatch ${destination.id} and ${formData.destination}.`,
          );
        }
        await onValidated({
          source,
          destination,
          assetRegistry,
          formData,
          tokenMetadata,
          amountInSmallestUnit,
        });
        setValidating(false);
      } catch (err: unknown) {
        console.error(err);
        await onError(formData, err as Error);
        setValidating(false);
      }
    },
    [
      destination,
      form,
      onValidated,
      setValidating,
      assetRegistry,
      onError,
      source,
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
                <FormLabel>From</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {locations.map((s) => {
                          let name: string;
                          if (s.type === "ethereum") {
                            const eth = assetRegistry.ethereumChains[s.source];
                            if (!eth.evmParachainId) {
                              name = "Ethereum";
                            } else {
                              const evmChain =
                                assetRegistry.parachains[eth.evmParachainId];
                              name = `${evmChain.info.name} (EVM)`;
                            }
                          } else {
                            name = assetRegistry.parachains[s.source].info.name;
                          }
                          return (
                            <SelectItem key={s.id} value={s.id}>
                              <SelectItemWithIcon
                                label={name}
                                image={s.id}
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
          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {destinations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <SelectItemWithIcon
                              label={s.name}
                              image={s.id}
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
        <div className="transfer-details">
          {sourceAccount && (
            <FormField
              control={form.control}
              name="sourceAccount"
              render={({ field }) => (
                <FormItem {...field}>
                  <div className="grid grid-cols-2 space-x-2">
                    <FormLabel>From account</FormLabel>
                    <BalanceDisplay
                      source={source}
                      token={token}
                      tokenMetadata={tokenMetadata}
                      displayDecimals={8}
                    />
                  </div>
                  <FormControl>
                    <>
                      {source.type == "ethereum" ? (
                        <SelectedEthereumWallet field={field} />
                      ) : (
                        <SelectedPolkadotAccount
                          field={field}
                          source={source.id}
                        />
                      )}
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {beneficiaries && beneficiaries.length > 0 && (
            <FormField
              control={form.control}
              name="beneficiary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To account</FormLabel>
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
          )}
          <div className="flex space-x-2">
            <div className="w-3/5">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        className="text-right"
                        type="string"
                        placeholder="0.0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-2/5">
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
                            {source.destinations[destination.key].map((t) => {
                              const asset =
                                assetRegistry.ethereumChains[
                                  assetRegistry.ethChainId
                                ].assets[t.toLowerCase()];
                              return (
                                <SelectItem key={t} value={t}>
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
            <FeeDisplay
              className="inline"
              source={source.type}
              destination={destination}
              token={token}
              displayDecimals={8}
            />
          </div>
          <br />
          <SubmitButton
            ethereumAccounts={ethereumAccounts}
            polkadotAccounts={polkadotAccounts}
            beneficiaries={beneficiaries}
            destination={destination}
            source={source}
            tokenMetadata={tokenMetadata}
            validating={validating}
            context={context}
          />
        </div>
      </form>
    </Form>
  );
};

interface SubmitButtonProps {
  ethereumAccounts: string[] | null;
  polkadotAccounts: WalletAccount[] | null;
  destination: Destination;
  source: assetsV2.Source;
  tokenMetadata: assets.ERC20Metadata | null;
  validating: boolean;
  beneficiaries: AccountInfo[] | null;
  context: Context | null;
}

function SubmitButton({
  ethereumAccounts,
  polkadotAccounts,
  destination,
  source,
  validating,
  tokenMetadata,
  beneficiaries,
  context,
}: SubmitButtonProps) {
  if (tokenMetadata !== null && context !== null) {
    if (
      (ethereumAccounts === null || ethereumAccounts.length === 0) &&
      source.type === "ethereum"
    ) {
      return <ConnectEthereumWalletButton variant="default" />;
    }
    if (
      (polkadotAccounts === null || polkadotAccounts.length === 0) &&
      source.type === "substrate"
    ) {
      return <ConnectPolkadotWalletButton variant="default" />;
    }
    if (
      (beneficiaries === null || beneficiaries.length === 0) &&
      destination.type === "ethereum"
    ) {
      return <ConnectEthereumWalletButton variant="default" />;
    }
    if (
      (beneficiaries === null || beneficiaries.length === 0) &&
      destination.type === "substrate"
    ) {
      return <ConnectPolkadotWalletButton variant="default" />;
    }
  }
  return (
    <div className="flex flex-col items-center">
      <Button
        disabled={context === null || tokenMetadata === null || validating}
        className="w-1/3 action-button"
        type="submit"
      >
        {context === null
          ? "Connecting..."
          : validating
            ? "Validating"
            : "Submit"}
      </Button>
    </div>
  );
}
