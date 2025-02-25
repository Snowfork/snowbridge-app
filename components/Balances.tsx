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
  handleSufficientTokens: (
    assetHubSufficient: boolean,
    parachainSufficient: boolean,
  ) => void;
  handleTopUpCheck: (
    xcmFee: bigint,
    xcmBalance: bigint,
    xcmBalanceDestination: bigint,
  ) => void;
  handleBalanceCheck: (fetchBalance: string) => void;
}

// Utility function to query balances
const getBalanceData = async (
  api: ApiPromise,
  account: string,
  decimals: number,
) => {
  const {
    //@ts-ignore -- Unfortunately, the typing isn't upto date
    data: { free, frozen },
  } = await api.query.system.account<AccountInfo>(account);

  return formatBalance({
    number: free.toBigInt() - frozen.toBigInt(),
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
  handleBalanceCheck,
}) => {
  const context = useAtomValue(snowbridgeContextAtom);
  const [balanceData, setBalanceData] = useState({
    destinationBalance: "0",
    destinationSymbol: "",
    destinationName: "",
    sourceBalance: "0",
    sourceSymbol: "",
    sourceName: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const checkXcmFee = useCallback(async () => {
    if (!context || !sourceAccount) return;
    if (sourceId === destinationId) return;

    try {
      const parachainId =
        destinationId === "assethub" ? sourceId : destinationId;
      const parachain = parachainInfo.find((val) => val.id === parachainId);

      if (!parachain) return;
      const api = await context.parachain(parachain.parachainId);
      const { xcmFee } = parachain.switchPair[0];

      const assetHubBalanceDestination = await (
        await context.assetHub()
      ).query.system.account<AccountInfo>(sourceAccount);

      const fungibleBalance = await api.query.fungibles.account<
        Option<AssetBalance>
      >(parachain.switchPair[0].xcmFee.remoteXcmFee.V4.id, sourceAccount);

      setError(null);

      handleTopUpCheck(
        BigInt(xcmFee.amount),
        fungibleBalance.unwrapOrDefault().balance.toBigInt(),
        assetHubBalanceDestination.data.free.toBigInt() -
          //@ts-ignore -- Unfortunately, doesn't exist in the polkadot typing
          assetHubBalanceDestination.data.frozen.toBigInt(),
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
  }, [
    context,
    destinationId,
    handleTopUpCheck,
    parachainInfo,
    sourceAccount,
    sourceId,
  ]);

  const checkSufficientTokens = useCallback(async () => {
    if (!context || !beneficiary) return;
    try {
      const parachainId =
        destinationId === "assethub" ? sourceId : destinationId;

      const assetHubApi = await context.assetHub();
      const finder = parachainInfo.find((val) => val.id === parachainId);
      if (!finder) return;
      const parachainApi = await context.parachain(finder.parachainId);

      const checkAssetHubBalanceED =
        await assetHubApi.query.system.account<AccountInfo>(beneficiary);

      const assetHubSufficient =
        checkAssetHubBalanceED.sufficients.gtn(0) ||
        checkAssetHubBalanceED.providers.gtn(0);

      const checkParachainBalanceED =
        await parachainApi.query.system.account<AccountInfo>(beneficiary);

      const parachainSufficient =
        checkParachainBalanceED.sufficients.gtn(0) ||
        checkParachainBalanceED.providers.gtn(0);

      handleSufficientTokens(assetHubSufficient, parachainSufficient);
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
    sourceId,
  ]);

  const fetchBalanceData = useCallback(async () => {
    if (!context || !sourceAccount) return;
    if (sourceId === destinationId) return;

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
          ? await context.assetHub()
          : await context.parachain(parachain.parachainId!);

      const destinationApi =
        destinationId === "assethub"
          ? await context.assetHub()
          : await context.parachain(parachain.parachainId!);

      if (sourceId === "assethub") {
        const sourceBalance = await fetchForeignAssetsBalances(
          sourceApi,
          parachain.switchPair[0].remoteAssetId,
          sourceAccount,
          parachain.switchPair[0].tokenMetadata.decimals,
        );

        const destinationBalance = await getBalanceData(
          destinationApi,
          sourceAccount,
          parachain.switchPair[0].tokenMetadata.decimals,
        );

        setBalanceData({
          destinationBalance,
          destinationSymbol: parachain.switchPair[0].tokenMetadata.symbol,
          destinationName: parachain.name,
          sourceBalance,
          sourceSymbol: parachain.switchPair[0].tokenMetadata.symbol,
          sourceName: "Asset Hub",
        });
        handleBalanceCheck(sourceBalance);
      } else {
        const { tokenDecimal, tokenSymbol } =
          await assets.parachainNativeAsset(sourceApi);
        const sourceBalance = await getBalanceData(
          sourceApi,
          sourceAccount,
          tokenDecimal,
        );

        const destinationBalance = await fetchForeignAssetsBalances(
          destinationApi,
          parachain.switchPair[0].remoteAssetId,
          sourceAccount,
          parachain.switchPair[0].tokenMetadata.decimals,
        );

        setBalanceData({
          destinationBalance,
          destinationSymbol: parachain.switchPair[0].tokenMetadata.symbol,
          destinationName: "Asset Hub",
          sourceBalance,
          sourceSymbol: tokenSymbol,
          sourceName: parachain.name,
        });
        handleBalanceCheck(sourceBalance);
      }

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
  }, [
    context,
    destinationId,
    handleBalanceCheck,
    parachainInfo,
    sourceAccount,
    sourceId,
  ]);

  useEffect(() => {
    checkXcmFee();
    const iv = setInterval(checkXcmFee, 10000);
    return () => clearInterval(iv);
  }, [checkXcmFee]);

  useEffect(() => {
    fetchBalanceData();
    const iv = setInterval(fetchBalanceData, 10000);
    return () => clearInterval(iv);
  }, [fetchBalanceData]);

  useEffect(() => {
    checkSufficientTokens();
    const iv = setInterval(checkSufficientTokens, 10000);
    return () => clearInterval(iv);
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
  const { destinationBalance, destinationSymbol, sourceBalance, sourceSymbol } =
    balanceData;

  return (
    <>
      <div className="text-sm text-right text-muted-foreground px-1">
        Source Balance: {sourceBalance} {sourceSymbol}
      </div>
      <div className="text-sm text-right text-muted-foreground px-1">
        Destination Balance: {destinationBalance} {destinationSymbol}
      </div>
    </>
  );
};

export default PolkadotBalance;
