"use client";

import { useTransferHistory } from "@/hooks/useTransferHistory";
import { formatBalance, trimAccount } from "@/lib/utils";
import {
  ethereumAccountAtom,
  ethereumAccountsAtom,
  ethereumChainIdAtom,
  ethersProviderAtom,
} from "@/store/ethereum";
import {
  polkadotAccountAtom,
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom,
} from "@/store/polkadot";
import {
  assetErc20MetaDataAtom,
  relayChainNativeAssetAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import {
  PendingTransferAction,
  Transfer,
  transfersPendingLocalAtom,
} from "@/store/transferHistory";
import { zodResolver } from "@hookform/resolvers/zod";
import { Signer } from "@polkadot/api/types";
import {
  Context,
  assets,
  environment,
  history,
  toEthereum,
  toPolkadot,
} from "@snowbridge/api";
import { WalletAccount } from "@talismn/connect-wallets";
import { BrowserProvider, parseUnits } from "ethers";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BusyDialog } from "./busyDialog";
import { ErrorDialog } from "./errorDialog";
import { SelectedEthereumWallet } from "./selectedEthereumAccount";
import { SelectedPolkadotAccount } from "./selectedPolkadotAccount";
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
import { Toggle } from "./ui/toggle";
import { LucideHardHat } from "lucide-react";
import { track } from "@vercel/analytics";

type AppRouter = ReturnType<typeof useRouter>;
type ValidationError =
  | ({ kind: "toPolkadot" } & toPolkadot.SendValidationError)
  | ({ kind: "toEthereum" } & toEthereum.SendValidationError);

const formSchema = z.object({
  source: z.string().min(1, "Select source."),
  destination: z.string().min(1, "Select destination."),
  token: z.string().min(1, "Select token."),
  amount: z
    .string()
    .regex(
      /^([1-9][0-9]{0,37})|([0-9]{0,37}\.+[0-9]{0,18})$/,
      "Invalid amount",
    ),
  beneficiary: z
    .string()
    .min(1, "Select beneficiary.")
    .regex(
      /^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{47,48})$/,
      "Invalid address format.",
    ),
  sourceAccount: z
    .string()
    .min(1, "Select source account.")
    .regex(
      /^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{47,48})$/,
      "Invalid address format.",
    ),
});

const getTokenBalance = async (
  context: Context,
  token: string,
  ethereumChainId: bigint,
  source: environment.TransferLocation,
  sourceAccount: string,
): Promise<{
  balance: bigint;
  gatewayAllowance?: bigint;
}> => {
  switch (source.type) {
    case "substrate": {
      if (source.paraInfo?.paraId === undefined) {
        throw Error(`ParaId not configured for source ${source.name}.`);
      }
      const parachain =
        context.polkadot.api.parachains[source.paraInfo?.paraId] ??
        context.polkadot.api.assetHub;
      const location = assets.erc20TokenToAssetLocation(
        parachain.registry,
        ethereumChainId,
        token,
      );
      const balance = await assets.palletAssetsBalance(
        parachain,
        location,
        sourceAccount,
        "foreignAssets",
      );
      return { balance: balance ?? 0n, gatewayAllowance: undefined };
    }
    case "ethereum": {
      return await assets.assetErc20Balance(context, token, sourceAccount);
    }
    default:
      throw Error(`Unknown source type ${source.type}.`);
  }
};

const errorMessage = (err: any) => {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  return "Unknown error";
};

const updateBalance = (
  context: Context,
  ethereumChainId: number,
  source: environment.TransferLocation,
  sourceAccount: string,
  token: string,
  tokenMetadata: assets.ERC20Metadata,
  setBalanceDisplay: (_: string) => void,
  setError: (_: ErrorInfo | null) => void,
) => {
  getTokenBalance(
    context,
    token,
    BigInt(ethereumChainId),
    source,
    sourceAccount,
  )
    .then((result) => {
      let allowance = "";
      if (result.gatewayAllowance !== undefined) {
        allowance = ` (Allowance: ${formatBalance(result.gatewayAllowance ?? 0n, Number(tokenMetadata.decimals))} ${tokenMetadata.symbol})`;
      }
      setBalanceDisplay(
        `${formatBalance(result.balance, Number(tokenMetadata.decimals))} ${tokenMetadata.symbol} ${allowance}`,
      );
    })
    .catch((err) => {
      console.error(err);
      setBalanceDisplay("unknown");
      setError({
        title: "Error",
        description: `Could not fetch asset balance.`,
        errors: [],
      });
    });
};

const doApproveSpend = async (
  context: Context | null,
  ethereumProvider: BrowserProvider | null,
  token: string,
  amount: bigint,
): Promise<void> => {
  if (context == null || ethereumProvider == null) return;

  const signer = await ethereumProvider.getSigner();
  const response = await toPolkadot.approveTokenSpend(
    context,
    signer,
    token,
    amount,
  );

  console.log("approval response", response);
  const receipt = await response.wait();
  console.log("approval receipt", receipt);
  if (receipt?.status === 0) {
    // check success
    throw Error("Token spend approval failed.");
  }
};

const doDepositAndApproveWeth = async (
  context: Context | null,
  ethereumProvider: BrowserProvider | null,
  token: string,
  amount: bigint,
): Promise<void> => {
  if (context == null || ethereumProvider == null) return;

  const signer = await ethereumProvider.getSigner();
  const response = await toPolkadot.depositWeth(context, signer, token, amount);
  console.log("deposit response", response);
  const receipt = await response.wait();
  console.log("deposit receipt", receipt);
  if (receipt?.status === 0) {
    // check success
    throw Error("Token deposit failed.");
  }

  return await doApproveSpend(context, ethereumProvider, token, amount);
};

type ErrorInfo = {
  title: string;
  description: string;
  errors: ValidationError[];
};

const userFriendlyErrorMessage = (
  error: ValidationError,
  formData: FormData,
) => {
  if (error.kind === "toPolkadot") {
    if (
      error.code == toPolkadot.SendValidationCode.BeneficiaryAccountMissing &&
      formData.destination === "assethub"
    ) {
      return "Beneficiary does not hold existential deposit on destination. Already have DOT on Polkadot? Teleport DOT to the beneficiary address on Asset Hub using your wallet.";
    }
    if (error.code == toPolkadot.SendValidationCode.InsufficientFee) {
      return "Insufficient ETH balance to pay transfer fees.";
    }
    return error.message;
  } else if (error.kind === "toEthereum") {
    if (error.code == toEthereum.SendValidationCode.InsufficientFee) {
      return "Insufficient DOT balance to pay transfer fees. Already have DOT on Polkadot? Teleport DOT to the source address on Asset Hub using your wallet.";
    }
    return error.message;
  }
  return (error as any).message;
};

type FormData = {
  source: string;
  sourceAccount: string;
  destination: string;
  token: string;
  amount: string;
  beneficiary: string;
};

const getDestinationTokenIdByAddress = (
  tokenAddress: string,
  destination?: environment.TransferLocation,
): string | undefined => {
  return (destination?.erc20tokensReceivable ?? []).find(
    (token) => token.address === tokenAddress,
  )?.id;
};

const parseAmount = (
  decimals: string,
  metadata: assets.ERC20Metadata,
): bigint => {
  return parseUnits(decimals, metadata.decimals);
};

const SendErrorDialog: FC<{
  info: ErrorInfo | null;
  formData: FormData;
  destination: environment.TransferLocation;
  onDepositAndApproveWeth: () => Promise<void>;
  onApproveSpend: () => Promise<void>;
  dismiss: () => void;
}> = ({
  info,
  formData,
  destination,
  dismiss,
  onDepositAndApproveWeth,
  onApproveSpend,
}) => {
  const token = getDestinationTokenIdByAddress(formData.token, destination);
  let errors = info?.errors ?? [];
  const insufficentAsset = errors.find(
    (error) =>
      error.kind === "toPolkadot" &&
      error.code === toPolkadot.SendValidationCode.InsufficientToken,
  );
  errors = errors.filter(
    (error) =>
      !(
        error.kind === "toPolkadot" &&
        error.code === toPolkadot.SendValidationCode.ERC20SpendNotApproved &&
        insufficentAsset !== undefined
      ),
  );

  const fixAction = (error: ValidationError): JSX.Element => {
    if (
      error.kind === "toPolkadot" &&
      error.code === toPolkadot.SendValidationCode.InsufficientToken &&
      token === "WETH"
    ) {
      return (
        <Button className="py-1" size="sm" onClick={onDepositAndApproveWeth}>
          Deposit WETH and Approve Spend
        </Button>
      );
    }
    if (
      error.kind === "toPolkadot" &&
      error.code === toPolkadot.SendValidationCode.ERC20SpendNotApproved
    ) {
      return (
        <Button className="py-1" size="sm" onClick={onApproveSpend}>
          Approve WETH Spend
        </Button>
      );
    }
    if (
      error.code === toPolkadot.SendValidationCode.BeneficiaryAccountMissing
    ) {
      return (
        <Button
          className="text-blue-600 py-1 h-auto"
          variant="link"
          onClick={() => {
            window.open(
              "https://support.polkadot.network/support/solutions/articles/65000181800-what-is-statemint-and-statemine-and-how-do-i-use-them-#Sufficient-and-non-sufficient-assets",
            );
          }}
        >
          Help
        </Button>
      );
    }
    return <></>;
  };
  let errorList = <></>;
  if (errors.length > 0) {
    errorList = (
      <ol className="flex-col list-inside list-disc">
        {errors.map((e, i) => (
          <li key={i} className="p-1">
            {userFriendlyErrorMessage(e, formData)}
            {fixAction(e)}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ErrorDialog
      open={info !== null}
      dismiss={dismiss}
      title={info?.title ?? "Error"}
      description={info?.description ?? "Unknown Error"}
    >
      {errorList}
    </ErrorDialog>
  );
};

export type AccountInfo = {
  key: string;
  name: string;
  type: "substrate" | "ethereum";
};
export type SelectAccountProps = {
  field: any;
  allowManualInput: boolean;
  accounts: AccountInfo[];
};
export const SelectAccount: FC<SelectAccountProps> = ({
  field,
  allowManualInput,
  accounts,
}) => {
  const [accountFromWallet, setBeneficiaryFromWallet] = useState(true);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);
  if (
    !allowManualInput &&
    accountFromWallet &&
    accounts.length == 0 &&
    (polkadotAccounts == null || polkadotAccounts.length == 0)
  ) {
    return (
      <Button
        className="w-full"
        variant="link"
        onClick={(e) => {
          e.preventDefault();
          setPolkadotWalletModalOpen(true);
        }}
      >
        Connect Polkadot
      </Button>
    );
  }
  let input: JSX.Element;
  if (!allowManualInput && accountFromWallet && accounts.length > 0) {
    input = (
      <Select
        key="controlled"
        onValueChange={field.onChange}
        value={field.value}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {accounts.map((acc, i) =>
              acc.type === "substrate" ? (
                <SelectItem key={acc.key + "-" + i} value={acc.key}>
                  <div>{acc.name}</div>
                  <pre className="md:hidden inline">
                    {trimAccount(acc.key, 18)}
                  </pre>
                  <pre className="hidden md:inline">{acc.key}</pre>
                </SelectItem>
              ) : (
                <SelectItem key={acc.key + "-" + i} value={acc.key}>
                  <pre className="md:hidden inline">
                    {trimAccount(acc.name, 18)}
                  </pre>
                  <pre className="hidden md:inline">{acc.name}</pre>
                </SelectItem>
              ),
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  } else {
    input = (
      <Input
        key="plain"
        placeholder="0x0000000000000000000000000000000000000000"
        {...field}
      />
    );
  }

  return (
    <>
      {input}
      <div className={"flex justify-end " + (allowManualInput ? "" : "hidden")}>
        <Toggle
          defaultPressed={false}
          pressed={!accountFromWallet}
          onPressedChange={(p) => setBeneficiaryFromWallet(!p)}
          className="text-xs"
        >
          Input account manually.
        </Toggle>
      </div>
    </>
  );
};

const validateOFAC = async (
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

const onSubmit = (
  context: Context | null,
  source: environment.TransferLocation,
  destination: environment.TransferLocation,
  setError: Dispatch<SetStateAction<ErrorInfo | null>>,
  setBusyMessage: Dispatch<SetStateAction<string>>,
  polkadotAccount: WalletAccount | null,
  ethereumAccount: string | null,
  ethereumProvider: BrowserProvider | null,
  tokenMetadata: assets.ERC20Metadata | null,
  appRouter: AppRouter,
  form: UseFormReturn<FormData>,
  refreshHistory: () => void,
  addPendingTransaction: (_: PendingTransferAction) => void,
): ((data: FormData) => Promise<void>) => {
  return async (data) => {
    track("Validate Send", data);

    try {
      if (tokenMetadata == null) throw Error(`No erc20 token metadata.`);

      const amountInSmallestUnit = parseAmount(data.amount, tokenMetadata);
      if (amountInSmallestUnit === 0n) {
        const errorMessage = "Amount must be greater than 0.";
        form.setError("amount", { message: errorMessage });
        return;
      }

      const minimumTransferAmount =
        destination.erc20tokensReceivable.find(
          (t) => t.address.toLowerCase() === data.token.toLowerCase(),
        )?.minimumTransferAmount ?? 1n;
      if (amountInSmallestUnit < minimumTransferAmount) {
        const errorMessage = `Cannot send less than minimum value of ${formatBalance(minimumTransferAmount, Number(tokenMetadata.decimals.toString()))} ${tokenMetadata.symbol}.`;
        form.setError(
          "amount",
          {
            message: errorMessage,
          },
          { shouldFocus: true },
        );
        track("Validate Failed", { ...data, errorMessage });
        return;
      }

      if (!(await validateOFAC(data, form))) {
        track("OFAC Validation.", data);
        return;
      }

      if (source.id !== data.source)
        throw Error(
          `Invalid form state: source mismatch ${source.id} and ${data.source}.`,
        );
      if (destination.id !== data.destination)
        throw Error(
          `Invalid form state: source mismatch ${destination.id} and ${data.destination}.`,
        );
      if (context === null) throw Error(`Context not connected.`);

      setBusyMessage("Validating...");

      let messageId: string;
      let transfer: Transfer;
      switch (source.type) {
        case "substrate": {
          if (destination.type !== "ethereum")
            throw Error(`Invalid form state: destination type mismatch.`);
          if (source.paraInfo === undefined)
            throw Error(
              `Invalid form state: source does not have parachain info.`,
            );
          if (polkadotAccount === null)
            throw Error(`Polkadot Wallet not connected.`);
          if (polkadotAccount.address !== data.sourceAccount)
            throw Error(`Source account mismatch.`);
          const walletSigner = {
            address: polkadotAccount.address,
            signer: polkadotAccount.signer! as Signer,
          };
          const plan = await toEthereum.validateSend(
            context,
            walletSigner,
            source.paraInfo.paraId,
            data.beneficiary,
            data.token,
            amountInSmallestUnit,
          );
          console.log(plan);
          if (plan.failure) {
            track("Plan Failed", {
              ...data,
              errors: JSON.stringify(plan.failure.errors),
            });
            setBusyMessage("");
            setError({
              title: "Send Plan Failed",
              description:
                "Some preflight checks failed when planning the transfer.",
              errors: plan.failure.errors.map((e) => ({
                kind: "toEthereum",
                ...e,
              })),
            });
            return;
          }

          setBusyMessage(
            "Waiting for transaction to be confirmed by wallet. After finalization transfers can take up to 4 hours.",
          );
          const result = await toEthereum.send(context, walletSigner, plan);
          messageId = result.success?.messageId || "";
          transfer = {
            id: messageId,
            status: history.TransferStatus.Pending,
            info: {
              amount: amountInSmallestUnit.toString(),
              sourceAddress: data.sourceAccount,
              beneficiaryAddress: data.beneficiary,
              tokenAddress: data.token,
              when: new Date(),
            },
            submitted: {
              block_hash:
                result.success?.sourceParachain?.blockHash ??
                result.success?.assetHub.blockHash ??
                "",
              block_num:
                result.success?.sourceParachain?.blockNumber ??
                result.success?.assetHub.blockNumber ??
                0,
              block_timestamp: 0,
              messageId: messageId,
              account_id: data.source,
              bridgeHubMessageId: "",
              extrinsic_hash:
                result.success?.sourceParachain?.txHash ??
                result.success?.assetHub.txHash ??
                "",
              extrinsic_index:
                result.success?.sourceParachain !== undefined
                  ? result.success.sourceParachain.blockNumber.toString() +
                    "-" +
                    result.success.sourceParachain.txIndex.toString()
                  : result.success?.assetHub !== undefined
                    ? result.success?.assetHub?.blockNumber.toString() +
                      "-" +
                      result.success?.assetHub.txIndex.toString()
                    : "unknown",

              relayChain: {
                block_hash: result.success?.relayChain.submittedAtHash ?? "",
                block_num: 0,
              },
              success: true,
            },
          };
          console.log(result);
          break;
        }
        case "ethereum": {
          if (destination.type !== "substrate")
            throw Error(`Invalid form state: destination type mismatch.`);
          if (destination.paraInfo === undefined)
            throw Error(
              `Invalid form state: destination does not have parachain id.`,
            );
          if (ethereumProvider === null)
            throw Error(`Ethereum Wallet not connected.`);
          if (ethereumAccount === null)
            throw Error(`Wallet account not selected.`);
          if (ethereumAccount !== data.sourceAccount)
            throw Error(`Selected account does not match source data.`);
          const signer = await ethereumProvider.getSigner();
          if (signer.address.toLowerCase() !== data.sourceAccount.toLowerCase())
            throw Error(`Source account mismatch.`);
          const plan = await toPolkadot.validateSend(
            context,
            signer,
            data.beneficiary,
            data.token,
            destination.paraInfo.paraId,
            amountInSmallestUnit,
            destination.paraInfo.destinationFeeDOT,
            {
              maxConsumers: destination.paraInfo.maxConsumers,
              ignoreExistentialDeposit:
                destination.paraInfo.skipExistentialDepositCheck,
            },
          );
          console.log(plan);
          if (plan.failure) {
            track("Plan Failed", {
              ...data,
              errors: JSON.stringify(plan.failure.errors),
            });
            setBusyMessage("");
            setError({
              title: "Send Plan Failed",
              description:
                "Some preflight checks failed when planning the transfer.",
              errors: plan.failure.errors.map((e) => ({
                kind: "toPolkadot",
                ...e,
              })),
            });
            return;
          }

          setBusyMessage(
            "Waiting for transaction to be confirmed by wallet. After finalization transfers can take up to 15-20 minutes.",
          );
          const result = await toPolkadot.send(context, signer, plan);

          messageId = result.success?.messageId || "";
          transfer = {
            id: messageId,
            status: history.TransferStatus.Pending,
            info: {
              amount: amountInSmallestUnit.toString(),
              sourceAddress: data.sourceAccount,
              beneficiaryAddress: data.beneficiary,
              tokenAddress: data.token,
              when: new Date(),
              destinationParachain: destination.paraInfo.paraId,
              destinationFee: destination.paraInfo.destinationFeeDOT.toString(),
            },
            submitted: {
              blockHash: result.success?.ethereum.blockHash ?? "",
              blockNumber: result.success?.ethereum.blockNumber ?? 0,
              channelId: "",
              messageId: messageId,
              logIndex: 0,
              transactionIndex: 0,
              transactionHash: result.success?.ethereum.transactionHash ?? "",
              nonce: 0,
              parentBeaconSlot: 0,
            },
          };
          console.log(result);
          break;
        }
        default:
          throw Error(`Invalid form state: cannot infer source type.`);
      }
      track("Send Success", {
        ...data,
        messageId,
      });
      form.reset();
      const transferUrl = `/history#${messageId}`;
      appRouter.prefetch(transferUrl);
      transfer.isWalletTransaction = true;
      addPendingTransaction({
        kind: "add",
        transfer,
      });
      refreshHistory();
      toast.info("Transfer Successful", {
        position: "bottom-center",
        closeButton: true,
        duration: 60000,
        id: "transfer_success",
        description: "Token transfer was succesfully initiated.",
        important: true,
        action: {
          label: "View",
          onClick: () => {
            appRouter.push(transferUrl);
          },
        },
      });
      setBusyMessage("");
    } catch (err: any) {
      console.error(err);
      track("Send Failed", {
        ...data,
        message: errorMessage(err),
      });
      setBusyMessage("");
      setError({
        title: "Send Error",
        description: `Error occured while trying to send transaction.`,
        errors: [],
      });
    }
  };
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
  const router = useRouter();

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
              formatBalance(fee, assetHubNativeToken?.tokenDecimal ?? 0) +
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
            setFeeDisplay(formatBalance(fee, 18) + " ETH");
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
        ? ethereumAccount ?? undefined
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
                onSubmit(
                  context,
                  source,
                  destination,
                  setError,
                  setBusyMessage,
                  polkadotAccount,
                  ethereumAccount,
                  ethereumProvider,
                  tokenMetadata,
                  router,
                  form,
                  refreshHistory,
                  transfersPendingLocal,
                ),
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
