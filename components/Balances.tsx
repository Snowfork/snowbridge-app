import { snowbridgeContextAtom } from "@/store/snowbridge";
import { fetchForeignAssetsBalances } from "@/utils/balances";
import { formatBalance } from "@/utils/formatting";
import { ParaConfig } from "@/utils/parachainConfigs";
import { ErrorInfo } from "@/utils/types";
import { ApiPromise } from "@polkadot/api";
import { Option } from "@polkadot/types";
import { AccountInfo, AssetBalance } from "@polkadot/types/interfaces";
import { assets } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import React, { useState, useEffect, useCallback, FC } from "react";

interface Props {
  sourceAccount: string;
  sourceId: string;
  destinationId: string;
  beneficiary: string;
  parachainInfo: ParaConfig[];
  handleSufficientTokens: (result: boolean) => void;
  handleTopUpCheck: (
    xcmFee: bigint,
    xcmBalance: bigint,
    xcmBalanceDestination: bigint,
  ) => void;
}

// Utility function to query balances
const getBalanceData = async (
  api: ApiPromise,
  account: string,
  decimals: number,
) => {
  const balance = await api.query.system.account<AccountInfo>(account);

  return formatBalance({
    number: balance.data.free.toBigInt(),
    decimals,
    displayDecimals: 3,
  });
};

const PolkadotBalance: FC<Props> = ({
  sourceAccount,
  sourceId,
  destinationId,
  beneficiary,
  parachainInfo,
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
    if (!context || sourceId === "assethub") return;

    try {
      const parachain = parachainInfo.find((val) => val.id === sourceId);

      if (!parachain) return;
      const api = context.polkadot.api.parachains[parachain.parachainId];
      const { xcmFee } = parachain.switchPair[0];

      const fungibleBalanceDestination =
        await context.polkadot.api.assetHub.query.system.account<AccountInfo>(
          sourceAccount,
        );

      const fungibleBalance = await api.query.fungibles.account<
        Option<AssetBalance>
      >(parachain.switchPair[0].xcmFee.remoteXcmFee.V4.id, sourceAccount);

      setError(null);

      handleTopUpCheck(
        BigInt(xcmFee.amount),
        fungibleBalance.unwrapOrDefault().balance.toBigInt(),
        fungibleBalanceDestination.data.free.toBigInt(),
      );
    } catch (error) {
      console.error(error);
      setError({
        title: "Unable to retrieve XCM fee balance",
        description:
          "Unable to get the accounts data and see if there are any tokens for the XCM balance",
        errors: [],
      });
    }
  }, [context, handleTopUpCheck, parachainInfo, sourceAccount, sourceId]);

  const checkSufficientTokens = useCallback(async () => {
    if (!context) return;
    try {
      const parachain = parachainInfo.find((val) => val.id === destinationId);
      if (!parachain) return;

      const api =
        destinationId === "assethub"
          ? context.polkadot.api.assetHub
          : context.polkadot.api.parachains[parachain.parachainId];

      const checkBalanceED =
        await api.query.system.account<AccountInfo>(beneficiary);

      const sufficient =
        checkBalanceED.sufficients.eqn(0) && checkBalanceED.providers.eqn(0);
      handleSufficientTokens(!sufficient);
      setError(null);
    } catch (e) {
      console.error(e);
      setError({
        title: "Unable to retrieve sufficients",
        description:
          "Unable to get the accounts data and see if there are any tokens",
        errors: [],
      });
    }
  }, [
    beneficiary,
    context,
    destinationId,
    handleSufficientTokens,
    parachainInfo,
  ]);

  const fetchBalanceData = useCallback(async () => {
    if (!context) return;

    try {
      const parachain =
        sourceId === "assethub"
          ? parachainInfo.find((val) => val.id === destinationId)
          : parachainInfo.find((val) => val.id === sourceId);

      if (!parachain) {
        return;
      }
      const sourceApi =
        sourceId === "assethub"
          ? context.polkadot.api.assetHub
          : context.polkadot.api.parachains[parachain.parachainId!];

      const destinationApi =
        destinationId === "assethub"
          ? context.polkadot.api.assetHub
          : context.polkadot.api.parachains[parachain.parachainId!];

      let destinationBalance, destinationSymbol, sourceBalance, sourceSymbol;

      if (sourceId === "assethub") {
        sourceBalance = await fetchForeignAssetsBalances(
          sourceApi,
          parachain.switchPair[0].remoteAssetId,
          sourceAccount,
          parachain.switchPair[0].tokenMetadata.decimals,
        );
        sourceSymbol = parachain.switchPair[0].tokenMetadata.symbol;
        destinationBalance = await getBalanceData(
          destinationApi,
          sourceAccount,
          parachain.switchPair[0].tokenMetadata.decimals,
        );
        destinationSymbol = parachain.switchPair[0].tokenMetadata.symbol;
      } else {
        const { tokenDecimal, tokenSymbol } =
          await assets.parachainNativeAsset(sourceApi);
        sourceBalance = await getBalanceData(
          sourceApi,
          sourceAccount,
          tokenDecimal,
        );
        sourceSymbol = tokenSymbol;
        console.log(
          destinationApi,
          parachain.switchPair[0].remoteAssetId,
          sourceAccount,
          parachain.switchPair[0].tokenMetadata.decimals,
        );
        destinationBalance = await fetchForeignAssetsBalances(
          destinationApi,
          parachain.switchPair[0].remoteAssetId,
          sourceAccount,
          parachain.switchPair[0].tokenMetadata.decimals,
        );
        destinationSymbol = parachain.switchPair[0].tokenMetadata.symbol;
      }

      setBalanceData({
        destinationBalance,
        destinationSymbol,
        sourceBalance,
        sourceSymbol,
      });
      setError(null);
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
  }, [context, destinationId, parachainInfo, sourceAccount, sourceId]);

  useEffect(() => {
    checkXcmFee();
  }, [checkXcmFee]);

  useEffect(() => {
    fetchBalanceData();
  }, [fetchBalanceData]);

  useEffect(() => {
    checkSufficientTokens();
  }, [checkSufficientTokens]);

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
        {sourceId} Balance: {balanceData.sourceBalance}{" "}
        {balanceData.sourceSymbol}
      </div>
      <div className="text-sm text-right text-muted-foreground px-1">
        {destinationId} Balance: {balanceData.destinationBalance}{" "}
        {balanceData.destinationSymbol}
      </div>
    </>
  );
};

export default PolkadotBalance;
