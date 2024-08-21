"use client";

import { FC, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

import {
  submitAssetHubToParachainTransfer,
  submitParachainToAssetHubTransfer,
} from "@/utils/onSubmit";

import { polkadotAccountAtom } from "@/store/polkadot";
import {
  snowbridgeEnvironmentAtom,
  snowbridgeContextAtom,
} from "@/store/snowbridge";
import { useAtomValue } from "jotai";

import { formSchema } from "@/utils/formSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorInfo } from "@/utils/types";

export const SwitchComponent: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);

  const context = useAtomValue(snowbridgeContextAtom);

  const polkadotAccount = useAtomValue(polkadotAccountAtom);

  const [source, setSource] = useState(snowbridgeEnvironment.locations[0]);
  const [sourceAccount, setSourceAccount] = useState<string>();
  const [destinations, setDestinations] = useState(
    snowbridgeEnvironment.locations.filter(({ id }) =>
      source.destinationIds.includes(id),
    ),
  );
  const [destination, setDestination] = useState(destinations[0]);
  const [token, setToken] = useState(
    destination.erc20tokensReceivable[0].address,
  );

  const [error, setError] = useState<ErrorInfo | null>(null);

  const [busyMessage, setBusyMessage] = useState("");
  useEffect(() => {
    if (!context) {
      return;
    }
  });
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
  const handleAssetHubToParachain = async () => {
    if (!polkadotAccount) {
      console.log("no account");
      return;
    }

    const transaction = await submitAssetHubToParachainTransfer({
      context,
      polkadotAccount,
      source: {
        id: "assethub",
        name: "Asset Hub",
        type: "substrate",
        destinationIds: ["ethereum", "rilt"],
        paraInfo: {
          paraId: 1000,
          destinationFeeDOT: 0n,
          skipExistentialDepositCheck: false,
          addressType: "32byte",
          decimals: 12,
          maxConsumers: 16,
        },
        erc20tokensReceivable: [
          {
            id: "WETH",
            address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
            minimumTransferAmount: 15_000_000_000_000n,
          },
          {
            id: "vETH",
            address: "0xc3d088842dcf02c13699f936bb83dfbbc6f721ab",
            minimumTransferAmount: 1n,
          },
          {
            id: "MUSE",
            address: "0xb34a6924a02100ba6ef12af1c798285e8f7a16ee",
            minimumTransferAmount: 1n,
          },
        ],
      },
      destination: {
        id: "Rilt",
        name: "Rilt",
        type: "substrate",
        destinationIds: ["assethub"],
        paraInfo: {
          paraId: 4504,
          destinationFeeDOT: 0n,
          skipExistentialDepositCheck: false,
          addressType: "32byte",
          decimals: 15,
          maxConsumers: 16,
        },
        erc20tokensReceivable: [
          {
            id: "RILT",
            address: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
            minimumTransferAmount: 1n,
          },
        ],
      },
      amountInSmallestUnit: BigInt(100000000000000),
      setError,
      setBusyMessage,
    });
    const { signer, address } = polkadotAccount;
    if (!signer) {
      return;
    }
    transaction.signAndSend(address, { signer });
  };
  const handleParachainToAssetHub = () => {
    if (!polkadotAccount) {
      console.log("no account");
      return;
    }

    const transaction = submitParachainToAssetHubTransfer({
      context,
      polkadotAccount,
      source: {
        id: "Rilt",
        name: "RILT",
        type: "substrate",
        destinationIds: ["assethub"],
        paraInfo: {
          paraId: 4504,
          destinationFeeDOT: 0n,
          skipExistentialDepositCheck: false,
          addressType: "32byte",
          decimals: 15,
          maxConsumers: 16,
        },
        erc20tokensReceivable: [
          {
            id: "RILT",
            address: "0xadd76ee7fb5b3d2d774b5fed4ac20b87f830db91",
            minimumTransferAmount: 1n,
          },
        ],
      },
      destination: {
        id: "assethub",
        name: "Asset Hub",
        type: "substrate",
        destinationIds: ["ethereum"],
        paraInfo: {
          paraId: 1000,
          destinationFeeDOT: 0n,
          skipExistentialDepositCheck: false,
          addressType: "32byte",
          decimals: 12,
          maxConsumers: 16,
        },
        erc20tokensReceivable: [
          {
            id: "WETH",
            address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
            minimumTransferAmount: 15_000_000_000_000n,
          },
          {
            id: "vETH",
            address: "0xc3d088842dcf02c13699f936bb83dfbbc6f721ab",
            minimumTransferAmount: 1n,
          },
          {
            id: "MUSE",
            address: "0xb34a6924a02100ba6ef12af1c798285e8f7a16ee",
            minimumTransferAmount: 1n,
          },
        ],
      },
      amountInSmallestUnit: BigInt(100000000000000),
      setError,
      setBusyMessage,
    });
    const { signer, address } = polkadotAccount;
    if (!signer) {
      return;
    }
    transaction.signAndSend(address, { signer });
  };

  return (
    <>
      <Card className="w-auto md:w-2/3">
        <CardContent>
          <CardHeader>
            <CardTitle>Switch</CardTitle>
            <CardDescription className="hidden md:flex">
              Switch Parachain tokens for ERC20 Parachain tokens via Asset Hub.
            </CardDescription>
          </CardHeader>

          <button className="w-full my-8" onClick={handleAssetHubToParachain}>
            submit asset hub to parachain
          </button>
          <button className="w-full my-8" onClick={handleParachainToAssetHub}>
            submit parachain to asset hub
          </button>
        </CardContent>
      </Card>
    </>
  );
};
