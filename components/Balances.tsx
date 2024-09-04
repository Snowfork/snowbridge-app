import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { formatBalance } from "@/utils/formatting";

import { environment } from "@snowbridge/api";
import React, { useState, useEffect } from "react";

const PolkadotBalance = ({
  sourceAccount,
  source,
  tokenMetadata,
}: {
  sourceAccount: string;
  source: environment.TransferLocation;
  tokenMetadata: {
    symbol: string;
    decimal: number;
    ss58Format: number;
  };
}) => {
  const [context] = useSnowbridgeContext();
  const [balance, setBalance] = useState("Fetching...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dotBalance, setDotBalance] = useState("");

  useEffect(() => {
    const fetchBalance = async () => {
      if (!context) return;

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
          const checkFun = await api.query.fungibles.account(
            {
              parents: 1,
              interior: "Here",
            },
            sourceAccount,
          );
          const rawDotBalance = (
            checkFun.toHuman()?.balance.toString() as string
          ).replaceAll(",", "");
          formattedDot = formatBalance({
            number: BigInt(rawDotBalance),
            decimals: 12,
          }).toString();
        }

        const formattedBalance = formatBalance({
          number: accountBalance,
          decimals: tokenMetadata.decimal,
        }).toString();

        setBalance(formattedBalance);
        setDotBalance(formattedDot!);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch balance");
        setLoading(false);
      }
    };

    fetchBalance();

    return () => {
      setBalance("Fetching...");
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
        {error}
      </div>
    );
  }

  return (
    <div className="text-sm text-right text-muted-foreground px-1">
      Balance: {tokenMetadata.symbol}
      {dotBalance ? (
        <>
          {" "}
          {balance} (DOT {dotBalance}){" "}
        </>
      ) : null}
    </div>
  );
};

export default PolkadotBalance;
