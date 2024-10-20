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
import { TransferFormData, transferFormSchema } from "@/utils/formSchema";
import { onSubmit } from "@/utils/onSubmit";
import { ErrorInfo } from "@/utils/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { assets } from "@snowbridge/api";
import { track } from "@vercel/analytics";
import { parseUnits } from "ethers";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { FC, useCallback, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { BusyDialog } from "./BusyDialog";
import { SendErrorDialog } from "./SendErrorDialog";
import { TransferForm } from "./TransferForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export const Transfer: FC = () => {
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
          <TransferForm
            form={form}
            onSubmit={onSubmit({
              context,
              source,
              destination,
              setError,
              setBusyMessage,
              polkadotAccount,
              ethereumAccount,
              ethereumProvider,
              tokenMetadata,
              appRouter,
              form,
              refreshHistory,
              addPendingTransaction: transfersPendingLocal,
            })}
          />
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
