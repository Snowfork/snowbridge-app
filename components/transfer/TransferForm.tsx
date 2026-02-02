import Image from "next/image";
import { ethereumAccountAtom, ethereumAccountsAtom } from "@/store/ethereum";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  walletAtom,
  PolkadotAccount,
} from "@/store/polkadot";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
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
import { assetsV2, Context } from "@snowbridge/api";
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
  formatUsdValue,
  transformSs58Format,
  trimAccount,
} from "@/utils/formatting";
import { ConnectEthereumWalletButton } from "../ConnectEthereumWalletButton";
import { ConnectPolkadotWalletButton } from "../ConnectPolkadotWalletButton";
import { SelectItemWithIcon } from "../SelectItemWithIcon";
import { TokenSelector } from "../TokenSelector";
import { ArrowRight, LucideAlertCircle } from "lucide-react";
import { useBridgeFeeInfo } from "@/hooks/useBridgeFeeInfo";
import { isHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import {
  AssetRegistry,
  ERC20Metadata,
  TransferLocation,
  Source,
  TransferRoute,
} from "@snowbridge/base-types";
import { useAppKit, useWalletInfo } from "@reown/appkit/react";
import {
  getTransferLocation,
  getTransferLocations,
} from "@snowbridge/registry";

function getBeneficiaries(
  destination: TransferLocation,
  polkadotAccounts: PolkadotAccount[],
  ethereumAccounts: string[],
  ss58Format: number,
) {
  const beneficiaries: AccountInfo[] = [];
  if (destination.kind === "polkadot") {
    polkadotAccounts
      .filter(
        (x) =>
          ((x as any).type === "ethereum" &&
            destination.parachain?.info.accountType === "AccountId20") ||
          ((x as any).type !== "ethereum" &&
            destination.parachain?.info.accountType === "AccountId32"),
      )
      .map((x) => {
        if ((x as any).type === "ethereum") {
          return {
            key: x.address,
            name: `${x.name} (${trimAccount(x.address, 20)})`,
            type: "ethereum" as const,
          };
        } else {
          return {
            key: transformSs58Format(x.address, ss58Format),
            name: x.name!,
            type: "substrate" as const,
          };
        }
      })
      .forEach((x) => beneficiaries.push(x));
  }
  if (
    destination.kind === "ethereum" ||
    destination.parachain?.info.accountType === "AccountId20"
  ) {
    ethereumAccounts?.forEach((x) => {
      if (!beneficiaries.find((b) => b.key.toLowerCase() === x.toLowerCase())) {
        beneficiaries.push({
          key: x,
          name: x,
          type: "ethereum" as const,
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
            type: "ethereum" as const,
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
  routes: readonly TransferRoute[];
}

function initialFormData(
  locations: Source[],
  registry: AssetRegistry,
  params: ReadonlyURLSearchParams,
) {
  let source = locations[0];
  const querySource = params.get("source");
  if (querySource) {
    const sourceLocation = locations.find(
      (l) =>
        l.id.toString() === querySource ||
        l.key.toLowerCase() == querySource.toLowerCase(),
    );
    if (sourceLocation) {
      source = sourceLocation;
    }
  }

  const destinations = Object.values(source.destinations).map((destination) =>
    getTransferLocation(registry, destination),
  );

  let destination = destinations[0];
  const queryDestination = params.get("destination");
  if (queryDestination) {
    const destinationLocation = destinations.find(
      (l) =>
        l.id.toString() === queryDestination ||
        l.key.toLowerCase() == queryDestination.toLowerCase(),
    );
    if (destinationLocation) {
      destination = destinationLocation;
    }
  }
  const assets = Object.keys(
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets,
  );

  const tokens = source.destinations[destination.key].assets;
  let token = tokens[0];
  const queryToken = params.get("token");
  if (queryToken) {
    const ethAsset = assets.find((asset) => {
      const assetMeta =
        registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[
          asset
        ];
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
      registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[
        asset
      ].name.match(/^Ether/),
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
  routes,
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
  const [sourceAccountSelectorOpen, setSourceAccountSelectorOpen] =
    useState(false);

  const locations = useMemo(() => getTransferLocations(routes), [routes]);

  const formParams = useSearchParams();

  const {
    source: firstSource,
    destinations: firstDestinations,
    destination: firstDestination,
    token: firstToken,
  } = initialFormData(locations, assetRegistry, formParams);

  // Read amount from query params
  const queryAmount = formParams.get("amount");

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
      source: formData?.source ?? source.key,
      destination: formData?.destination ?? destination.key,
      token: formData?.token ?? token,
      beneficiary: formData?.beneficiary,
      sourceAccount: formData?.sourceAccount ?? sourceAccount,
      amount: formData?.amount ?? (queryAmount || "0.0"),
    },
  });

  const watchToken = form.watch("token");
  const watchSource = form.watch("source");
  const watchDestination = form.watch("destination");
  const watchSourceAccount = form.watch("sourceAccount");
  const watchAmount = form.watch("amount");
  const [amountUsdValue, setAmountUsdValue] = useState<string | null>(null);

  // Auto-set sourceAccount when wallet connects or source type changes
  useEffect(() => {
    if (source.kind === "ethereum") {
      // Set to Ethereum account if connected, otherwise clear
      form.setValue("sourceAccount", ethereumAccount ?? "");
    } else if (source.kind === "polkadot") {
      // For substrate sources, filter accounts by account type (AccountId20 vs AccountId32)
      const accountType =
        assetRegistry.parachains[`polkadot_${source.id}`]?.info.accountType ??
        "AccountId32";
      const validAccounts = polkadotAccounts?.filter(
        filterByAccountType(accountType),
      );
      // Check if current polkadotAccount is valid for this chain's account type
      const currentAccountValid = validAccounts?.some(
        (acc) => acc.address === polkadotAccount?.address,
      );
      if (currentAccountValid) {
        form.setValue("sourceAccount", polkadotAccount?.address ?? "");
      } else if (validAccounts && validAccounts.length > 0) {
        // Pick the first valid account
        form.setValue("sourceAccount", validAccounts[0].address);
      } else {
        form.setValue("sourceAccount", "");
      }
    }
  }, [
    source.kind,
    ethereumAccount,
    polkadotAccount?.address,
    polkadotAccounts,
    assetRegistry,
    form,
    source.id,
  ]);

  // Auto-set beneficiary when wallet connects or destination type changes
  const watchBeneficiary = form.watch("beneficiary");
  useEffect(() => {
    if (destination.kind === "ethereum") {
      // For Ethereum destination, check if current beneficiary is a valid Ethereum address
      const isValidEthAddress =
        watchBeneficiary?.startsWith("0x") && watchBeneficiary?.length === 42;
      if (!isValidEthAddress) {
        // Set to Ethereum account if connected, otherwise clear
        form.setValue("beneficiary", ethereumAccount ?? "");
      }
    } else if (destination.kind === "polkadot") {
      // For substrate destinations, filter accounts by account type (AccountId20 vs AccountId32)
      const accountType =
        destination.parachain?.info.accountType ?? "AccountId32";
      const validAccounts = polkadotAccounts?.filter(
        filterByAccountType(accountType),
      );

      // Also include Ethereum accounts for AccountId20 destinations
      const validEthereumAccounts =
        accountType === "AccountId20" ? (ethereumAccounts ?? []) : [];

      // Check if current beneficiary is valid for this destination's account type
      const isCurrentValid =
        validAccounts?.some(
          (acc) =>
            acc.address.toLowerCase() === watchBeneficiary?.toLowerCase(),
        ) ||
        validEthereumAccounts.some(
          (acc) => acc.toLowerCase() === watchBeneficiary?.toLowerCase(),
        );

      if (!isCurrentValid) {
        // Pick the first valid account
        if (validAccounts && validAccounts.length > 0) {
          form.setValue("beneficiary", validAccounts[0].address);
        } else if (validEthereumAccounts.length > 0) {
          form.setValue("beneficiary", validEthereumAccounts[0]);
        } else {
          form.setValue("beneficiary", "");
        }
      }
    }
  }, [
    destination.kind,
    destination.parachain?.info.accountType,
    destination.key,
    ethereumAccount,
    ethereumAccounts,
    polkadotAccount?.address,
    polkadotAccounts,
    watchBeneficiary,
    form,
  ]);

  const { data: feeInfo, error: feeError } = useBridgeFeeInfo(
    getTransferLocation(assetRegistry, source),
    destination,
    token,
  );

  // Get balance for MAX button
  const { data: balanceInfo } = useTokenBalance(
    watchSourceAccount ?? "",
    getTransferLocation(assetRegistry, source),
    destination,
    token,
  );

  useEffect(() => {
    let newDestinations = destinations;
    let newSource = source;
    if (source.key !== watchSource) {
      newSource = locations.find((s) => s.key == watchSource)!;
      setSource(newSource);
      if (newSource.kind === "polkadot") {
        const accountType =
          assetRegistry.parachains[`polkadot_${newSource.id}`].info.accountType;
        const validAccounts = polkadotAccounts?.filter(
          filterByAccountType(accountType),
        );
        // Check if current account is valid for the new chain
        const currentAccountValid = validAccounts?.some(
          (acc) => acc.address === watchSourceAccount,
        );
        if (!currentAccountValid) {
          const newAccount =
            validAccounts && validAccounts.length > 0
              ? validAccounts[0].address
              : "";
          form.setValue("sourceAccount", newAccount);
        }
      }
      // Note: Ethereum source account is handled by the auto-set useEffect

      newDestinations = Object.values(newSource.destinations).map(
        (destination) => getTransferLocation(assetRegistry, destination),
      );
      setDestinations(newDestinations);
    }
    const newDestination =
      newDestinations.find((d) => d.key == watchDestination) ??
      newDestinations[0];
    setDestination(newDestination);
    form.resetField("destination", { defaultValue: newDestination.key });

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
  }, [
    destination.kind,
    destinations,
    environment,
    ethereumAccount,
    form,
    formData?.beneficiary,
    polkadotAccount?.address,
    source.id,
    source.kind,
    watchDestination,
    watchSource,
    watchToken,
    watchSourceAccount,
    source,
    locations,
    assetRegistry,
    polkadotAccounts,
    firstSource.kind,
  ]);

  // Network switching is handled at transfer time, not on source change
  // This prevents wallet disconnection issues during source selection

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
          setAmountUsdValue(formatUsdValue(usdAmount));
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
          destination.kind === "polkadot" &&
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
        if (destination.kind === "polkadot") {
          const ahMin =
            destination.parachain?.assets[formData.token.toLowerCase()]
              .minimumBalance ?? minimumTransferAmount;
          const dhMin =
            assetRegistry.parachains[`polkadot_${assetRegistry.assetHubParaId}`]
              .assets[formData.token.toLowerCase()].minimumBalance;
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

        if (source.key !== formData.source) {
          throw Error(
            `Invalid form state: source mismatch ${source.key} and ${formData.source}.`,
          );
        }
        if (destination.key !== formData.destination) {
          throw Error(
            `Invalid form state: source mismatch ${destination.key} and ${formData.destination}.`,
          );
        }
        await onValidated({
          source: getTransferLocation(assetRegistry, source),
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
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
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
                          const location = getTransferLocation(
                            assetRegistry,
                            s,
                          );
                          return (
                            <SelectItem key={s.key} value={s.key}>
                              <SelectItemWithIcon
                                label={location.name}
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
              const currentSource = form.getValues("source");
              const currentDest = form.getValues("destination");
              // Swap source and destination
              form.setValue("source", currentDest);
              form.setValue("destination", currentSource);
              // Clear accounts to force re-validation with new chain types
              // The auto-set useEffects will pick valid accounts for the new chains
              form.setValue("sourceAccount", "");
              form.setValue("beneficiary", "");
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
        <div className="transfer-details space-y-4">
          <div>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormControl>
                    <div className="amountContainer flex flex-col w-full px-3 py-3 gap-2">
                      {/* Row 1: Send label + source wallet + balance */}
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Send</span>
                        {/* Only show account if wallet is connected for current source type */}
                        {watchSourceAccount &&
                          ((source.kind === "ethereum" && ethereumAccount) ||
                            (source.kind === "polkadot" &&
                              polkadotAccount?.address)) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (source.kind === "ethereum") {
                                  openEthereumWallet({ view: "Account" });
                                } else {
                                  setSourceAccountSelectorOpen(true);
                                }
                              }}
                              className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
                            >
                              {source.kind === "ethereum" ? (
                                <Image
                                  src={
                                    ethereumWalletInfo?.icon ||
                                    "/images/ethereum.png"
                                  }
                                  width={16}
                                  height={16}
                                  alt="wallet"
                                  className="rounded-sm"
                                />
                              ) : (
                                <Image
                                  src={
                                    polkadotWallet?.logo?.src ||
                                    "/images/polkadot.png"
                                  }
                                  width={16}
                                  height={16}
                                  alt="wallet"
                                  className="rounded-sm"
                                />
                              )}
                              <span>{trimAccount(watchSourceAccount, 12)}</span>
                              <span>
                                {balanceInfo && tokenMetadata
                                  ? `${formatBalance({
                                      number: balanceInfo.balance,
                                      decimals: Number(tokenMetadata.decimals),
                                      displayDecimals: 4,
                                    })} ${tokenMetadata.symbol}`
                                  : "..."}
                              </span>
                            </button>
                          )}
                      </div>
                      {/* Row 2: Amount input + token selector */}
                      <div className="flex flex-row items-center gap-2">
                        <input
                          className="amountInput flex-1 p2 text-left text-2xl sm:text-3xl font-medium bg-transparent border-0 outline-none placeholder:text-muted-foreground min-w-0"
                          type="string"
                          placeholder="0.0"
                          {...field}
                        />
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
                                  sourceAccount={watchSourceAccount}
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
                      {/* Row 3: USD value + percentage buttons */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {amountUsdValue ?? "\u00A0"}
                        </div>
                        <div className="flex items-center gap-1">
                          {[25, 50, 75].map((percent) => (
                            <Button
                              key={percent}
                              type="button"
                              variant="clean"
                              className="h-6 px-2 py-0.5 text-xs rounded-full border-0 glass-pill"
                              onClick={() => {
                                if (balanceInfo && tokenMetadata) {
                                  const percentAmount =
                                    (balanceInfo.balance * BigInt(percent)) /
                                    100n;
                                  const formatted = formatBalance({
                                    number: percentAmount,
                                    decimals: Number(tokenMetadata.decimals),
                                    displayDecimals: Number(
                                      tokenMetadata.decimals,
                                    ),
                                  });
                                  form.setValue("amount", formatted);
                                }
                              }}
                              disabled={!balanceInfo || !tokenMetadata}
                            >
                              {percent}%
                            </Button>
                          ))}
                          <Button
                            type="button"
                            variant="clean"
                            className="h-6 px-2 py-0.5 text-xs rounded-full border-0 glass-pill"
                            onClick={() => {
                              if (balanceInfo && tokenMetadata) {
                                let maxAmount = balanceInfo.balance;

                                // If transferring ETH from Ethereum, subtract the fee
                                const isEther =
                                  token.toLowerCase() ===
                                  assetsV2.ETHER_TOKEN_ADDRESS.toLowerCase();
                                if (
                                  isEther &&
                                  source.kind === "ethereum" &&
                                  feeInfo
                                ) {
                                  const feeBuffer =
                                    (feeInfo.totalFee * 120n) / 100n;
                                  maxAmount =
                                    maxAmount > feeBuffer
                                      ? maxAmount - feeBuffer
                                      : 0n;
                                }

                                // If transferring native token from substrate, subtract the fee
                                if (
                                  source.kind === "polkadot" &&
                                  feeInfo &&
                                  tokenMetadata.symbol.toUpperCase() ===
                                    feeInfo.symbol.toUpperCase()
                                ) {
                                  const feeBuffer =
                                    (feeInfo.totalFee * 120n) / 100n;
                                  maxAmount =
                                    maxAmount > feeBuffer
                                      ? maxAmount - feeBuffer
                                      : 0n;
                                }

                                const maxBalance = formatBalance({
                                  number: maxAmount,
                                  decimals: Number(tokenMetadata.decimals),
                                  displayDecimals: Number(
                                    tokenMetadata.decimals,
                                  ),
                                });
                                form.setValue("amount", maxBalance);
                              }
                            }}
                            disabled={!balanceInfo || !tokenMetadata}
                          >
                            Max
                          </Button>
                        </div>
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
          {/* Only show To account when beneficiaries are available */}
          {beneficiaries && beneficiaries.length > 0 && (
            <FormField
              control={form.control}
              name="beneficiary"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SelectAccount
                      accounts={beneficiaries}
                      field={field}
                      allowManualInput={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <div className="glass-sub p-4 space-y-2 card-shadow">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-glass">Delivery fee</dt>
              <dd className="text-primary">
                <FeeDisplay
                  className="inline"
                  source={getTransferLocation(assetRegistry, source)}
                  destination={destination}
                  token={token}
                  displayDecimals={8}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-glass">Estimated delivery time</dt>
              <dd className="text-primary">
                {source.kind === "ethereum" ? "~20 minutes" : "~35 minutes"}
              </dd>
            </div>
          </div>
          <SubmitButton
            ethereumAccount={ethereumAccount}
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

      {/* Source Account Selector Dialog */}
      <Dialog
        open={sourceAccountSelectorOpen}
        onOpenChange={setSourceAccountSelectorOpen}
      >
        <DialogContent className="glass more-blur">
          <DialogHeader>
            <DialogTitle className="text-center font-medium text-primary">
              Select Source Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {polkadotAccounts && polkadotAccounts.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Your Accounts
                </div>
                <div className="max-h-64 overflow-y-auto ui-slimscroll bg-white/40 dark:bg-slate-800/60 rounded-lg">
                  {polkadotAccounts
                    .filter(
                      filterByAccountType(
                        source.kind === "polkadot"
                          ? (assetRegistry.parachains[`polkadot_${source.id}`]
                              ?.info.accountType ?? "AccountId32")
                          : "AccountId32",
                      ),
                    )
                    .map((account, i) => (
                      <button
                        key={account.address + "-" + i}
                        type="button"
                        onClick={() => {
                          form.setValue("sourceAccount", account.address);
                          setSourceAccountSelectorOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-md transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
                          watchSourceAccount?.toLowerCase() ===
                          account.address.toLowerCase()
                            ? "bg-white/60 dark:bg-slate-700/60"
                            : ""
                        }`}
                      >
                        {polkadotWallet?.logo?.src && (
                          <Image
                            src={polkadotWallet.logo.src}
                            width={24}
                            height={24}
                            alt="wallet"
                            className="rounded-sm flex-shrink-0"
                          />
                        )}
                        <div className="flex flex-col items-start min-w-0">
                          <span className="font-medium text-primary text-sm">
                            {account.name || "Account"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate w-full">
                            {trimAccount(account.address, 24)}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No accounts available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
};

interface SubmitButtonProps {
  ethereumAccount: string | null;
  ethereumAccounts: string[] | null;
  polkadotAccounts: PolkadotAccount[] | null;
  destination: TransferLocation;
  source: Source;
  feeInfo?: FeeInfo;
  tokenMetadata: ERC20Metadata | null;
  validating: boolean;
  beneficiaries: AccountInfo[] | null;
  context: Context | null;
}

function SubmitButton({
  ethereumAccount,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by showing loading state until mounted
  if (!mounted) {
    return (
      <div className="flex flex-col items-center">
        <Button disabled className="w-full action-button" type="button">
          Loading...
        </Button>
      </div>
    );
  }

  if (tokenMetadata !== null && context !== null) {
    // Check if Ethereum wallet is connected for Ethereum source
    if (!ethereumAccount && source.kind === "ethereum") {
      return <ConnectEthereumWalletButton variant="default" />;
    }
    // Check if Polkadot wallet is connected for Substrate source
    if (
      (polkadotAccounts === null || polkadotAccounts.length === 0) &&
      source.kind === "polkadot"
    ) {
      return <ConnectPolkadotWalletButton variant="default" />;
    }
    // Check beneficiaries for destination
    if (
      (beneficiaries === null || beneficiaries.length === 0) &&
      destination.kind === "ethereum"
    ) {
      return <ConnectEthereumWalletButton variant="default" />;
    }
    if (
      (beneficiaries === null || beneficiaries.length === 0) &&
      destination.kind === "polkadot"
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
              : "Next"}
      </Button>
    </div>
  );
}
