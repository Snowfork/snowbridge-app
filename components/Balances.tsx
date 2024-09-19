import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { formatBalance } from "@/utils/formatting";
import { ErrorInfo } from "@/utils/types";
import { assets, environment } from "@snowbridge/api";
import React, { useState, useEffect } from "react";

const PolkadotBalance = ({
  sourceAccount,
  source,
  destination,
  tokenMetadata,
}: {
  sourceAccount: string;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
  tokenMetadata: {
    symbol: string;
    decimal: number;
    ss58Format: number;
  };
}) => {
  const [context] = useSnowbridgeContext();
  const [sourceBalance, setSourceBalance] = useState("Fetching...");
  const [destinationBalance, setDestinationBalance] = useState("Fetching...");
  const [xcmFeeBalance, setXcmFeeBalance] = useState("Fetching...");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [dotBalance, setDotBalance] = useState<string | null>("");

  // const checkFeeBalance = async () => {
  //   if (!context) return;

  //   const tokenInfo = await assets.assetErc20Metadata(context, tokenAddress);
  //   // assets.parachainNativeAsset();
  //   console.log(tokenInfo);
  // };
  useEffect(() => {
    if (!destination) return;
    if (!context) return;
    const d = async () => {
      destination.id;
      try {
        console.log(
          "handleAsset.balance.toString()",
          destination,
          // source.erc20tokensReceivable.find((val) => val.id == destination),
        );
        // setDestinationBalance(handleAsset.name);
      } catch (e) {
        console.log(e);
      }
    };
    d();
  }, [context, destination, source, sourceAccount]);
  useEffect(() => {
    if (!context || !source || !tokenMetadata || !sourceAccount) {
      return;
    }
    const fetchBalance = async () => {
      try {
        let formattedDot = null;

        let api =
          source.id === "assethub"
            ? context.polkadot.api.assetHub
            : context.polkadot.api.parachains[source.paraInfo?.paraId!];

        const {
          data: { free: accountBalance },
        } = await api.query.system.account(sourceAccount);

        if (source.paraInfo?.paraId !== 1000) {
          const checkFungibleBalance = await api.query.fungibles.account(
            {
              parents: 1,
              interior: "Here",
            },
            sourceAccount,
          );

          if (checkFungibleBalance.toHuman()) {
            const rawFungibleBalance = (
              checkFungibleBalance.toHuman()?.balance.toString() as string
            ).replaceAll(",", "");
            formattedDot = formatBalance({
              number: BigInt(rawFungibleBalance),
              decimals: tokenMetadata.decimal,
            }).toString();
            setDotBalance(formattedDot);
          }
        }

        const formattedBalance = formatBalance({
          number: BigInt(accountBalance.toHuman().replaceAll(",", "")),
          decimals: tokenMetadata.decimal,
        });

        setSourceBalance(formattedBalance);
        setDotBalance(formattedDot);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError({
          title: "Error",
          description: "Could not fetch balance.",
          errors: [],
        });
        setLoading(false);
      }
    };

    fetchBalance();

    return () => {
      setSourceBalance("Fetching...");
      setError(null);
      setLoading(true);
    };
  }, [sourceAccount, context, source, tokenMetadata]);

  if (loading) {
    return (
      <div className="text-sm text-right text-muted-foreground px-1">
        Fetching...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-right text-muted-foreground px-1">
        {error.description}
      </div>
    );
  }

  return (
    <div className="text-sm text-right text-muted-foreground px-1">
      Source Balance: {sourceBalance} {tokenMetadata.symbol}
      Destination Balance: {destinationBalance} {tokenMetadata.symbol}
      XCM Fee Balance: {xcmFeeBalance} {tokenMetadata.symbol}
      {dotBalance ? <>(DOT {dotBalance}) </> : null}
    </div>
  );
};

export default PolkadotBalance;
