import { ethereumAccountAtom, ethereumAccountsAtom } from "@/store/ethereum";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
  walletAtom,
} from "@/store/polkadot";
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
import { assetsV2, Context, environment } from "@snowbridge/api";
import { WalletAccount } from "@talismn/connect-wallets";
import { useAtom, useAtomValue } from "jotai";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { BalanceDisplay } from "../BalanceDisplay";
import { FeeDisplay } from "../FeeDisplay";
import { SelectAccount } from "../SelectAccount";
import { SelectedEthereumWallet } from "../SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "../SelectedPolkadotAccount";
import { Button } from "../ui/button";
import { useTokenBalance } from "@/hooks/useTokenBalance";
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
import { fetchTokenPrices } from "@/utils/coindesk";
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
import { TokenSelector } from "../TokenSelector";
import { ArrowRight, ChevronsUpDown } from "lucide-react";
import { useBridgeFeeInfo } from "@/hooks/useBridgeFeeInfo";
import {
  getChainId,
  getEthereumNetwork,
  switchNetwork,
} from "@/lib/client/web3modal";
import { isHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import { AssetRegistry, ERC20Metadata } from "@snowbridge/base-types";
import { useAppKit, useWalletInfo } from "@reown/appkit/react";

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
  assetRegistry: AssetRegistry;
}

function initialFormData(
  locations: assetsV2.Source[],
  registry: AssetRegistry,
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
      source.destinations[destination].type,
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

  const tokens = source.destinations[destination.key].assets;
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
  const polkadotWallet = useAtomValue(walletAtom);

  // Wallet connection hooks
  const { open: openEthereumWallet } = useAppKit();
  const { walletInfo: ethereumWalletInfo } = useWalletInfo();
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);

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
  const watchAmount = form.watch("amount");
  const [amountUsdValue, setAmountUsdValue] = useState<string | null>(null);

  const { data: feeInfo, error: feeError } = useBridgeFeeInfo(
    assetsV2.getTransferLocation(assetRegistry, source.type, source.key),
    destination,
    token,
  );

  // Get balance for MAX button
  const { data: balanceInfo } = useTokenBalance(
    watchSourceAccount ?? "",
    assetsV2.getTransferLocation(assetRegistry, source.type, source.key),
    destination,
    token,
  );

  // Fetch balances for all tokens in the list
  const availableTokens = source.destinations[destination.key].assets;

  useEffect(() => {
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
          newSource.destinations[destination].type,
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

    const newTokens = newSource.destinations[newDestination.key].assets;
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
          setAmountUsdValue(`≈ $${usdAmount.toFixed(2)}`);
        } else {
          setAmountUsdValue(null);
        }
      } catch {
        setAmountUsdValue(null);
      }
    };

    calculateUsd();
  }, [watchAmount, tokenMetadata]);

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
        <div className="space-y-3">
          <div className="grid grid-cols-2 space-x-2">
            <FormLabel>Route</FormLabel>
          </div>
          <div className="glass-sub px-4 py-3 flex items-center justify-between gap-3">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="border-0 bg-transparent hover:bg-white/20 transition-colors dropdown-shadow">
                        <SelectValue placeholder="Select source" />
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

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full bg-white/[0.28] hover:bg-white/40 p-2 h-auto"
              onClick={() => {
                const currentSource = form.getValues("source");
                const currentDest = form.getValues("destination");
                form.setValue("source", currentDest);
                form.setValue("destination", currentSource);
              }}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="border-0 bg-transparent hover:bg-white/20 transition-colors dropdown-shadow">
                        <SelectValue placeholder="Select destination" />
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
        </div>
        <div className="transfer-details space-y-2">
          <FormField
            control={form.control}
            name="sourceAccount"
            render={({ field }) => (
              <FormItem {...field} className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>From account</FormLabel>
                  <div className="text-right">
                    <BalanceDisplay
                      source={assetsV2.getTransferLocation(
                        assetRegistry,
                        source.type,
                        source.key,
                      )}
                      destination={destination}
                      sourceAccount={watchSourceAccount ?? ""}
                      registry={assetRegistry}
                      token={token}
                      tokenMetadata={tokenMetadata}
                      displayDecimals={8}
                    />
                  </div>
                </div>
                <FormControl>
                  <div>
                    {source.type == "ethereum" ? (
                      ethereumAccounts === null ||
                      ethereumAccounts.length === 0 ? (
                        <button
                          type="button"
                          className="fake-dropdown flex items-center justify-between px-4 py-3 text-muted-glass cursor-pointer hover:bg-white/40 transition-colors w-full text-left"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await openEthereumWallet({ view: "Connect" });
                          }}
                        >
                          <span>Connect Ethereum wallet</span>
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </button>
                      ) : (
                        <SelectedEthereumWallet field={field} />
                      )
                    ) : polkadotAccounts === null ||
                      polkadotAccounts.length === 0 ? (
                      <button
                        type="button"
                        className="fake-dropdown flex items-center justify-between px-4 py-3 text-muted-glass cursor-pointer hover:bg-white/40 transition-colors w-full text-left"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPolkadotWalletModalOpen(true);
                        }}
                      >
                        <span>Connect Polkadot wallet</span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </button>
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
                        walletName={polkadotWallet?.title}
                      />
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="beneficiary"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>To account</FormLabel>
                <FormControl>
                  {beneficiaries && beneficiaries.length > 0 ? (
                    <SelectAccount
                      accounts={beneficiaries}
                      field={field}
                      allowManualInput={true}
                      destination={destination.id}
                      polkadotWalletName={polkadotWallet?.title}
                      ethereumWalletName={ethereumWalletInfo?.name}
                    />
                  ) : destination.type === "ethereum" ? (
                    <button
                      type="button"
                      className="fake-dropdown flex items-center justify-between px-4 py-3 text-muted-glass cursor-pointer hover:bg-white/40 transition-colors w-full text-left"
                      onClick={async (e) => {
                        await openEthereumWallet({ view: "Connect" });
                      }}
                    >
                      <span>Connect Ethereum wallet</span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="fake-dropdown flex items-center justify-between px-4 py-3 text-muted-glass cursor-pointer hover:bg-white/40 transition-colors w-full text-left"
                      onClick={(e) => {
                        setPolkadotWalletModalOpen(true);
                      }}
                    >
                      <span>Connect Polkadot wallet</span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </button>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="amountContainer flex items-center gap-2 w-full px-3 py-3">
                      <div className="flex-1 flex flex-col">
                        <input
                          className="amountInput p2 text-left text-3xl font-medium bg-transparent border-0 outline-none placeholder:text-muted-foreground"
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
                      <Button
                        type="button"
                        className="h-7 bg-dark-blue px-3 py-1 text-xs text-white hover:bg-black/90 flex-shrink-0 rounded-full border-0"
                        onClick={() => {
                          if (balanceInfo && tokenMetadata) {
                            const maxBalance = formatBalance({
                              number: balanceInfo.balance,
                              decimals: Number(tokenMetadata.decimals),
                              displayDecimals: Number(tokenMetadata.decimals),
                            });
                            form.setValue("amount", maxBalance);
                          }
                        }}
                        disabled={!balanceInfo || !tokenMetadata}
                      >
                        Max
                      </Button>
                      <FormField
                        control={form.control}
                        name="token"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <TokenSelector
                                value={field.value}
                                onChange={field.onChange}
                                assets={
                                  source.destinations[destination.key].assets
                                }
                                assetRegistry={assetRegistry}
                                ethChainId={assetRegistry.ethChainId}
                                sourceAccount={watchSourceAccount}
                                source={assetsV2.getTransferLocation(
                                  assetRegistry,
                                  source.type,
                                  source.key,
                                )}
                                destination={destination}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="glass-sub p-4 space-y-2 card-shadow transfer-spacing">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-glass">Delivery fee</dt>
              <dd className="text-primary">
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
              </dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-glass">Estimated delivery time</dt>
              <dd className="text-primary">
                {source.type === "ethereum" ? "~20 minutes" : "~35 minutes"}
              </dd>
            </div>
          </div>
          <div className="transfer-spacing"></div>
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
  tokenMetadata: ERC20Metadata | null;
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
        className="w-full action-button"
        type="submit"
      >
        {context === null
          ? "Connecting..."
          : validating
            ? "Validating..."
            : !feeInfo
              ? "Fetching Fees..."
              : "Review transfer"}
      </Button>
    </div>
  );
}
