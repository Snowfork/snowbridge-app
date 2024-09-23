import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { formatBalance } from "@/utils/formatting";
import { parachainConfigs } from "@/utils/parachainConfigs";
import { ErrorInfo } from "@/utils/types";
import { ApiPromise } from "@polkadot/api";
import { assets, environment } from "@snowbridge/api";
import React, { useState, useEffect, useCallback } from "react";

const getFormattedBalance = (balance: any, decimals: number) => {
  return formatBalance({
    number: BigInt(balance.toString().replaceAll(",", "")),
    decimals,
    displayDecimals: 3,
  });
};
const fetchBalances = async (
  api: ApiPromise,
  remoteAssetId: any,
  sourceAccount: string,
  decimals: number,
) => {
  const fungibleBalance = await api.query.foreignAssets.account(
    remoteAssetId,
    sourceAccount,
  );

  return getFormattedBalance(
    fungibleBalance.isEmpty ? 0 : fungibleBalance?.toHuman()?.balance,
    decimals,
  );
};

const PolkadotBalance = ({
  sourceAccount,
  source,
  destination,
}: {
  sourceAccount: string;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
}) => {
  const [context] = useSnowbridgeContext();
  const [balanceData, setBalanceData] = useState({
    switchBalance: "0",
    switchSymbol: "",
    sourceBalance: "0",
    sourceSymbol: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const fetchBalanceData = useCallback(async () => {
    if (!context || !source || !sourceAccount || !destination) return;

    try {
      const assetHubApi = context.polkadot.api.assetHub;
      const parachainApi =
        context.polkadot.api.parachains[source.paraInfo?.paraId!];
      let switchBalance, switchSymbol, sourceBalance, sourceSymbol;

      if (source.id === "assethub") {
        const { switchPair } = parachainConfigs[destination.name];
        const { tokenMetadata, remoteAssetId } = switchPair[0];

        switchBalance = await fetchBalances(
          assetHubApi,
          remoteAssetId,
          sourceAccount,
          tokenMetadata.decimals,
        );
        switchSymbol = tokenMetadata.symbol;

        const { tokenDecimal, tokenSymbol } =
          await assets.parachainNativeAsset(assetHubApi);
        const checkBalance =
          await assetHubApi.query.system.account(sourceAccount);

        sourceBalance = getFormattedBalance(
          checkBalance.isEmpty ? 0 : checkBalance.toHuman()?.data.free,
          tokenDecimal,
        );
        sourceSymbol = tokenSymbol;
      } else {
        // Handle other parachains
        const { switchPair } = parachainConfigs[source.name];
        const { tokenMetadata, remoteAssetId } = switchPair[0];

        // Fetch balance for other parachain
        switchBalance = await fetchBalances(
          assetHubApi,
          remoteAssetId,
          sourceAccount,
          tokenMetadata.decimals,
        );
        switchSymbol = tokenMetadata.symbol;

        const { tokenDecimal, tokenSymbol } =
          await assets.parachainNativeAsset(parachainApi);
        const checkBalance =
          await parachainApi.query.system.account(sourceAccount);
        sourceBalance = getFormattedBalance(
          checkBalance.toHuman()?.data.free,
          tokenDecimal,
        );
        sourceSymbol = tokenSymbol;
      }

      setBalanceData({
        switchBalance,
        switchSymbol,
        sourceBalance,
        sourceSymbol,
      });

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError({
        title: "Error",
        description: "Could not fetch balance.",
        errors: [],
      });
      setBalanceData({
        switchBalance: "0",
        switchSymbol: "",
        sourceBalance: "0",
        sourceSymbol: "",
      });
      setLoading(false);
    }
  }, [sourceAccount, context, source, destination]);

  useEffect(() => {
    if (source.name === destination.name) return;
    fetchBalanceData();

    return () => {
      setBalanceData({
        switchBalance: "0",
        switchSymbol: "",
        sourceBalance: "0",
        sourceSymbol: "",
      });
      setError(null);
      setLoading(true);
    };
  }, [fetchBalanceData]);

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
    <>
      <div className="text-sm text-right text-muted-foreground px-1">
        Source Balance: {balanceData.sourceBalance} {balanceData.sourceSymbol}
      </div>
      <div className="text-sm text-right text-muted-foreground px-1">
        Switch Balance: {balanceData.switchBalance} {balanceData.switchSymbol}
      </div>
    </>
  );
};

export default PolkadotBalance;
