"use client";
import { formatBalance } from "@/utils/formatting";
import { PendingTransferAction, Transfer } from "@/store/transferHistory";
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
import { BrowserProvider } from "ethers";
import { Dispatch, SetStateAction } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { track } from "@vercel/analytics";
import { errorMessage } from "./errorMessage";
import { parseAmount } from "@/utils/balances";
import { AppRouter, FormData, ErrorInfo } from "@/utils/types";
import { validateOFAC } from "@/components/Transfer";

export function onSubmit({
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
  addPendingTransaction,
}: {
  context: Context | null;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
  setError: Dispatch<SetStateAction<ErrorInfo | null>>;
  setBusyMessage: Dispatch<SetStateAction<string>>;
  polkadotAccount: WalletAccount | null;
  ethereumAccount: string | null;
  ethereumProvider: BrowserProvider | null;
  tokenMetadata: assets.ERC20Metadata | null;
  appRouter: AppRouter;
  form: UseFormReturn<FormData>;
  refreshHistory: () => void;
  addPendingTransaction: (_: PendingTransferAction) => void;
}): (data: FormData) => Promise<void> {
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
}
