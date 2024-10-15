"use client";

import { useTransferHistory } from "@/hooks/useTransferHistory";
import {
  ethereumAccountAtom,
  ethereumAccountsAtom,
  ethersProviderAtom,
} from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import {
  assetErc20MetaDataAtom,
  relayChainNativeAssetAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { transfersPendingLocalAtom } from "@/store/transferHistory";
import { doApproveSpend } from "@/utils/doApproveSpend";
import { doDepositAndApproveWeth } from "@/utils/doDepositAndApproveWeth";
import { errorMessage } from "@/utils/errorMessage";
import { formatBalance } from "@/utils/formatting";
import { TransferFormData, transferFormSchema } from "@/utils/formSchema";
import { onSubmit } from "@/utils/onSubmit";
import { AccountInfo, ErrorInfo } from "@/utils/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { assets, environment, toEthereum, toPolkadot } from "@snowbridge/api";
import { track } from "@vercel/analytics";
import { useAtomValue, useSetAtom } from "jotai";
import { LucideHardHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { FC, useCallback, useEffect, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BusyDialog } from "./BusyDialog";
import { SelectAccount } from "./SelectAccount";
import { SelectedEthereumWallet } from "./SelectedEthereumAccount";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";
import { SendErrorDialog } from "./SendErrorDialog";
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
import { parseUnits } from "ethers";
import { WalletAccount } from "@talismn/connect-wallets";

export const TransferForm1: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const assetHubNativeToken = useAtomValue(relayChainNativeAssetAtom);
  const assetErc20MetaData = useAtomValue(assetErc20MetaDataAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const appRouter = useRouter();
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

  const form: UseFormReturn<TransferFormData> = useForm<TransferFormData>({
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

  const watchSourceAccount = form.watch("sourceAccount");

  const depositAndApproveWeth = useCallback(async () => {
    if (
      tokenMetadata == null ||
      context == null ||
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
        parseUnits(formData.amount, tokenMetadata.decimals),
      );
      toast.info(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        id: "deposit_approval_result",
        description: "Token spend allowance approval was succesful.",
      });
      //updateBalance(
      //  context,
      //  snowbridgeEnvironment,
      //  source,
      //  sourceAccount,
      //  token,
      //  tokenMetadata,
      //  setBalanceDisplay,
      //  setError,
      //);
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
  ]);

  const approveSpend = useCallback(async () => {
    if (tokenMetadata == null || context == null || sourceAccount == undefined)
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
        parseUnits(formData.amount, tokenMetadata.decimals),
      );
      toast.info(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        id: "approval_result",
        description: "Token spend allowance approval was succesful.",
      });
      //updateBalance(
      //  context,
      //  snowbridgeEnvironment,
      //  source,
      //  sourceAccount,
      //  token,
      //  tokenMetadata,
      //  setError,
      //);
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
    tokenMetadata,
  ]);

  const beneficiaries = getBeneficiaries(
    destination,
    polkadotAccounts ?? [],
    ethereumAccounts,
  );

  return (
    <>
      <Card className="w-auto md:w-2/3">
        <CardHeader>
          <CardTitle>Transfer</CardTitle>
          <CardDescription className="hidden md:flex">
            Transfer tokens between Ethereum and Polkadot parachains.
          </CardDescription>
        </CardHeader>
        <CardContent></CardContent>
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
