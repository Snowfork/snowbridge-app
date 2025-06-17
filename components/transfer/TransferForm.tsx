import { ethereumAccountAtom, ethereumAccountsAtom } from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import {
  filterByAccountType,
  TransferFormData,
  transferFormSchema,
} from "@/utils/formSchema";
import { AccountInfo, FeeInfo, ValidationData } from "@/utils/types";
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
import {
  formatBalance,
  transformSs58Format,
  trimAccount,
} from "@/utils/formatting";
import { ConnectEthereumWalletButton } from "../ConnectEthereumWalletButton";
import { ConnectPolkadotWalletButton } from "../ConnectPolkadotWalletButton";
import { SelectItemWithIcon } from "../SelectItemWithIcon";
import { useBridgeFeeInfo } from "@/hooks/useBridgeFeeInfo";
import {
  getChainId,
  getEthereumNetwork,
  switchNetwork,
} from "@/lib/client/web3modal";
import { isHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import { AssetRegistry } from "@snowbridge/api/dist/assets_v2";

function getBeneficiaries(
  destination: assetsV2.TransferLocation,
  polkadotAccounts: WalletAccount[],
  ethereumAccounts: string[],
  ss58Format: number,
) {
  const beneficiaries: AccountInfo[] = [];
  if (destination.type === "substrate") {
    polkadotAccounts
      .filter(
        (x: any) =>
          (x.type === "ethereum" &&
            destination.parachain?.info.accountType === "AccountId20") ||
          (x.type !== "ethereum" &&
            destination.parachain?.info.accountType === "AccountId32"),
      )
      .map((x: any) => {
        if (x.type === "ethereum") {
          return {
            key: x.address,
            name: `${x.name} (${trimAccount(x.address, 20)})`,
            type: "ethereum" as environment.SourceType,
          };
        } else {
          return {
            key: transformSs58Format(x.address, ss58Format),
            name: x.name,
            type: destination.type,
          };
        }
      })
      .forEach((x) => beneficiaries.push(x));
  }
  if (
    destination.type === "ethereum" ||
    destination.parachain?.info.accountType === "AccountId20"
  ) {
    ethereumAccounts?.forEach((x) => {
      if (!beneficiaries.find((b) => b.key.toLowerCase() === x.toLowerCase())) {
        beneficiaries.push({
          key: x,
          name: x,
          type: "ethereum" as environment.SourceType,
        });
      }
    });

    polkadotAccounts
      .filter((x: any) => x.type === "ethereum")
      .forEach((x) => {
        if (
          !beneficiaries.find(
            (b) => b.key.toLowerCase() === x.address.toLowerCase(),
          )
        ) {
          beneficiaries.push({
            key: x.address,
            name: `${x.name} (${trimAccount(x.address, 20)})`,
            type: "ethereum" as environment.SourceType,
          });
        }
      });
  }

  return beneficiaries;
}

interface TransferFormProps {
  onValidated: (data: ValidationData) => Promise<unknown> | unknown;
  onError: (form: TransferFormData, error: Error) => Promise<unknown> | unknown;
  formData?: TransferFormData;
  assetRegistry: assetsV2.AssetRegistry;
}

function initialFormData(
  locations: assetsV2.Source[],
  registry: assetsV2.AssetRegistry,
  params: ReadonlyURLSearchParams,
) {
  let source = locations[0];
  const querySource = params.get("source");
  if (querySource) {
    const sourceLocation = locations.find(
      (l) =>
        l.id.toLowerCase() === querySource.toLowerCase() ||
        l.key.toLowerCase() == querySource.toLowerCase(),
    );
    if (sourceLocation) {
      source = sourceLocation;
    }
  }

  const destinations = Object.keys(source.destinations).map((destination) =>
    assetsV2.getTransferLocation(
      registry,
      source.type === "substrate" || source.id.match(/_evm$/)
        ? "ethereum"
        : "substrate",
      destination,
    ),
  );

  let destination = destinations[0];
  const queryDestination = params.get("destination");
  if (queryDestination) {
    const destinationLocation = destinations.find(
      (l) =>
        l.id.toLowerCase() === queryDestination.toLowerCase() ||
        l.key.toLowerCase() == queryDestination.toLowerCase(),
    );
    if (destinationLocation) {
      destination = destinationLocation;
    }
  }
  const assets = Object.keys(
    registry.ethereumChains[registry.ethChainId].assets,
  );

  const tokens = source.destinations[destination.key];
  let token = tokens[0];
  const queryToken = params.get("token");
  if (queryToken) {
    const ethAsset = assets.find((asset) => {
      const assetMeta =
        registry.ethereumChains[registry.ethChainId].assets[asset];
      return (
        assetMeta.name.toLowerCase() === token.toLowerCase() ||
        assetMeta.symbol.toLowerCase() === queryToken.toLowerCase() ||
        assetMeta.token.toLowerCase() == queryToken.toLowerCase()
      );
    });
    if (ethAsset) {
      token = ethAsset;
    }
  } else {
    const ethAsset = assets.find((asset) =>
      registry.ethereumChains[registry.ethChainId].assets[asset].name.match(
        /^Ether/,
      ),
    );
    if (ethAsset) {
      token = ethAsset;
    }
  }

  return {
    source,
    token,
    destination,
    destinations,
  };
}

export const TransferForm: FC<TransferFormProps> = ({
  onValidated,
  onError,
  formData,
  assetRegistry,
}) => {
  const environment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);

  const locations = useMemo(
    () => assetsV2.getTransferLocations(assetRegistry),
    [assetRegistry],
  );

  const formParams = useSearchParams();

  const {
    source: firstSource,
    destinations: firstDestinations,
    destination: firstDestination,
    token: firstToken,
  } = initialFormData(locations, assetRegistry, formParams);

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
    destination.parachain?.info.ss58Format ??
      assetRegistry.relaychain.ss58Format,
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
  const { data: feeInfo, error: feeError } = useBridgeFeeInfo(
    assetsV2.getTransferLocation(assetRegistry, source.type, source.key),
    destination,
    token,
  );

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
      if (newSource.type === "substrate") {
        const accountType =
          assetRegistry.parachains[newSource.key].info.accountType;
        const accounts = polkadotAccounts?.filter(
          filterByAccountType(accountType),
        );
        form.resetField("sourceAccount", {
          defaultValue:
            accounts && accounts.length > 0 ? accounts[0].address : undefined,
        });
      }

      newDestinations = Object.keys(newSource.destinations).map((destination) =>
        assetsV2.getTransferLocation(
          assetRegistry,
          newSource.type === "ethereum" &&
            newSource.key === assetRegistry.ethChainId.toString()
            ? "substrate"
            : "ethereum",
          destination,
        ),
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
    try {
      const chainId = getChainId();
      if (newSource.type === "ethereum" && newDestination.type === "ethereum") {
        if (chainId?.toString() !== newSource.key) {
          switchNetwork(getEthereumNetwork(Number(newSource.key)));
        }
      } else {
        if (chainId?.toString() !== assetRegistry.ethChainId.toString()) {
          switchNetwork(getEthereumNetwork(assetRegistry.ethChainId));
        }
      }
    } catch (error) {
      console.error(error);
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
    polkadotAccounts,
    firstSource.type,
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
          formData.amount.trim(),
          tokenMetadata.decimals,
        );
        if (amountInSmallestUnit === 0n) {
          const errorMessage = "Amount must be greater than 0.";
          form.setError("amount", { message: errorMessage });
          setValidating(false);
          return;
        }

        if (
          destination.type === "substrate" &&
          destination.parachain!.info.accountType === "AccountId32"
        ) {
          if (!isHex(formData.beneficiary)) {
            try {
              decodeAddress(formData.beneficiary);
            } catch (err) {
              console.error(err);
              form.setError("beneficiary", {
                message: "Not a valid SS58 address.",
              });
              setValidating(false);
              return;
            }
          } else {
            // 32 byte accounts
            if (!isHex(formData.beneficiary, 32 * 8)) {
              form.setError("beneficiary", {
                message: "Not a valid SS58 address or 32-byte account address.",
              });
              setValidating(false);
              return;
            }
          }
        } else {
          // 20 byte accounts
          if (!isHex(formData.beneficiary, 20 * 8)) {
            form.setError("beneficiary", {
              message: "Not a valid 20-byte account address.",
            });
            setValidating(false);
            return;
          }
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
        if (!feeInfo) {
          throw Error(`No delivery fee set. ${feeError}`);
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
          source: assetsV2.getTransferLocation(
            assetRegistry,
            source.type,
            source.key,
          ),
          destination,
          assetRegistry,
          formData,
          tokenMetadata,
          amountInSmallestUnit,
          fee: feeInfo,
        });
        setValidating(false);
      } catch (err: unknown) {
        console.error(err);
        await onError(formData, err as Error);
        setValidating(false);
      }
    },
    [
      tokenMetadata,
      destination,
      form,
      feeInfo,
      source,
      onValidated,
      assetRegistry,
      feeError,
      onError,
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
                            const eth = assetRegistry.ethereumChains[s.key];
                            if (!eth.evmParachainId) {
                              name = "Ethereum";
                            } else {
                              const evmChain =
                                assetRegistry.parachains[eth.evmParachainId];
                              name = `${evmChain.info.name} (EVM)`;
                            }
                          } else {
                            name = assetRegistry.parachains[s.key].info.name;
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
          <FormField
            control={form.control}
            name="sourceAccount"
            render={({ field }) => (
              <FormItem {...field}>
                <div className="grid grid-cols-2 space-x-2">
                  <FormLabel>From account</FormLabel>
                </div>
                <FormControl>
                  <div>
                    {source.type == "ethereum" ? (
                      <SelectedEthereumWallet field={field} />
                    ) : (
                      <SelectedPolkadotAccount
                        source={source.id}
                        polkadotAccounts={
                          polkadotAccounts?.filter(
                            filterByAccountType(
                              assetRegistry.parachains[source.key].info
                                .accountType,
                            ),
                          ) ?? []
                        }
                        polkadotAccount={watchSourceAccount}
                        onValueChange={field.onChange}
                        ss58Format={
                          assetRegistry.parachains[source.key]?.info
                            .ss58Format ??
                          assetRegistry.relaychain.ss58Format ??
                          0
                        }
                      />
                    )}
                    <div className="flex flex-row-reverse pt-1">
                      <BalanceDisplay
                        source={assetsV2.getTransferLocation(
                          assetRegistry,
                          source.type,
                          source.key,
                        )}
                        destination={destination}
                        sourceAccount={watchSourceAccount}
                        registry={assetRegistry}
                        token={token}
                        tokenMetadata={tokenMetadata}
                        displayDecimals={8}
                      />
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                      allowManualInput={true}
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
              source={assetsV2.getTransferLocation(
                assetRegistry,
                source.type,
                source.key,
              )}
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
            feeInfo={feeInfo}
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
  destination: assetsV2.TransferLocation;
  source: assetsV2.Source;
  feeInfo?: FeeInfo;
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
  feeInfo,
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
        disabled={
          context === null || tokenMetadata === null || validating || !feeInfo
        }
        className="w-1/3 action-button"
        type="submit"
      >
        {context === null
          ? "Connecting..."
          : validating
            ? "Validating..."
            : !feeInfo
              ? "Fetching Fees..."
              : "Submit"}
      </Button>
    </div>
  );
}
