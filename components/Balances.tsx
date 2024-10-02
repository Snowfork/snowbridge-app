import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  fetchForeignAssetsBalances,
  getFormattedBalance,
} from "@/utils/balances";
import { parachainConfigs } from "@/utils/parachainConfigs";
import { ErrorInfo } from "@/utils/types";
import { assets, environment } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import React, { useState, useEffect, useCallback, FC } from "react";

interface Props {
  sourceAccount: string;
  source: environment.TransferLocation;
  destination: environment.TransferLocation;
  beneficiary: string;
  handleSufficientTokens: (result: boolean) => void;
  handleTopUpCheck: (result: boolean) => void;
}

// Utility function to query balances
const getBalanceData = async (api: any, account: string, decimals: number) => {
  const balance = await api.query.system.account(account);
  return getFormattedBalance(balance.toJSON()?.data.free, decimals);
};

const PolkadotBalance: FC<Props> = ({
  sourceAccount,
  source,
  destination,
  beneficiary,
  handleSufficientTokens,
  handleTopUpCheck,
}) => {
  const context = useAtomValue(snowbridgeContextAtom);
  const [balanceData, setBalanceData] = useState({
    destinationBalance: "0",
    destinationSymbol: "",
    sourceBalance: "0",
    sourceSymbol: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const checkXcmFee = useCallback(async () => {
    if (!context || source.id === "assethub" || source.id === destination.id)
      return;

    try {
      const { switchPair } = parachainConfigs[source.name];
      const api = context.polkadot.api.parachains[source.paraInfo?.paraId!];
      const { xcmFee } = switchPair[0];
      const formattedFee = getFormattedBalance(xcmFee.amount, xcmFee.decimals);

      const fungibleBalance = await api.query.fungibles.account(
        switchPair[0].xcmFee.remoteXcmFee.V4.id,
        sourceAccount,
      );
      const xcmBalance = getFormattedBalance(
        fungibleBalance.isEmpty ? 0 : fungibleBalance.toJSON()!.balance,
        xcmFee.decimals,
      );
      handleTopUpCheck(xcmBalance <= formattedFee);
    } catch (e) {
      console.error(e);
    }
  }, [context, destination.id, handleTopUpCheck, source, sourceAccount]);

  const checkSufficientTokens = useCallback(async () => {
    if (!context) return;

    try {
      const api =
        destination.id === "assethub"
          ? context.polkadot.api.assetHub
          : context.polkadot.api.parachains[destination.paraInfo?.paraId!];

      const checkBalanceED = await api.query.system.account(beneficiary);
      const sufficient =
        checkBalanceED.sufficients == 0 && checkBalanceED.providers == 0;
      handleSufficientTokens(!sufficient);
    } catch (e) {
      console.error(e);
      setError({
        title: "Unable to retrieve sufficients",
        description:
          "Unable to get the accounts data and see if there are any tokens",
        errors: [],
      });
    }
  }, [context, destination, beneficiary, handleSufficientTokens]);

  const fetchBalanceData = useCallback(async () => {
    if (!context || source.name === destination.name) return;

    try {
      const sourceApi =
        source.id === "assethub"
          ? context.polkadot.api.assetHub
          : context.polkadot.api.parachains[source.paraInfo?.paraId!];

      const destinationApi =
        destination.id === "assethub"
          ? context.polkadot.api.assetHub
          : context.polkadot.api.parachains[destination.paraInfo?.paraId!];

      let destinationBalance, destinationSymbol, sourceBalance, sourceSymbol;

      if (source.id === "assethub") {
        const { switchPair } = parachainConfigs[destination.name];
        sourceBalance = await fetchForeignAssetsBalances(
          sourceApi,
          switchPair[0].remoteAssetId,
          sourceAccount,
          switchPair[0].tokenMetadata.decimals,
        );
        sourceSymbol = switchPair[0].tokenMetadata.symbol;
        destinationBalance = await getBalanceData(
          destinationApi,
          sourceAccount,
          switchPair[0].tokenMetadata.decimals,
        );
        destinationSymbol = switchPair[0].tokenMetadata.symbol;
      } else {
        const { tokenDecimal, tokenSymbol } =
          await assets.parachainNativeAsset(sourceApi);
        sourceBalance = await getBalanceData(
          sourceApi,
          sourceAccount,
          tokenDecimal,
        );
        sourceSymbol = tokenSymbol;
        const { switchPair } = parachainConfigs[source.name];
        destinationBalance = await fetchForeignAssetsBalances(
          destinationApi,
          switchPair[0].remoteAssetId,
          sourceAccount,
          switchPair[0].tokenMetadata.decimals,
        );
        destinationSymbol = switchPair[0].tokenMetadata.symbol;
      }

      setBalanceData({
        destinationBalance,
        destinationSymbol,
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
      setLoading(false);
    }
  }, [context, source, sourceAccount, destination]);

  useEffect(() => {
    checkXcmFee();
    fetchBalanceData();
    checkSufficientTokens();
  }, [checkXcmFee, fetchBalanceData, checkSufficientTokens]);

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
        {source.name} Balance: {balanceData.sourceBalance}{" "}
        {balanceData.sourceSymbol}
      </div>
      <div className="text-sm text-right text-muted-foreground px-1">
        {destination.name} Balance: {balanceData.destinationBalance}{" "}
        {balanceData.destinationSymbol}
      </div>
    </>
  );
};

export default PolkadotBalance;
