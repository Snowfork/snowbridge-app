import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { formatBalance } from "@/utils/formatting";
import { ApiPromise } from "@polkadot/api";
import { assets, environment } from "@snowbridge/api";
import React, { useState, useEffect } from "react";

const PolkadotBalance = ({
  sourceAccount,
  source,
  tokenMetadata,
}: {
  sourceAccount: string;
  source: environment.TransferLocation;
  tokenMetadata: assets.NativeAsset;
}) => {
  const [context] = useSnowbridgeContext();
  const [balance, setBalance] = useState("Fetching...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dotBalance, setDotBalance] = useState("");

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        let api: ApiPromise;
        let formattedDot;
        if (source.id === "assethub") {
          api = context?.polkadot.api.assetHub;
          setDotBalance(null);
        } else {
          api =
            context?.polkadot.api.parachains[source.paraInfo?.paraId ?? 1000];
        }
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
          formattedDot = formatBalance({
            number: BigInt(
              (checkFun.toHuman()?.balance.toString() as string).replaceAll(
                ",",
                "",
              ),
            ),
            decimals: 12,
            displayDecimals: 3,
          }).toString();
        }
        const formattedBalance = formatBalance({
          number: accountBalance,
          decimals: tokenMetadata.tokenDecimal,
          displayDecimals: 3,
        }).toString();
        setBalance(formattedBalance);
        setDotBalance(formattedDot);
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
      Balance: {tokenMetadata.tokenSymbol}{" "}
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
