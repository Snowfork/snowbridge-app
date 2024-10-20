import { FC, useEffect, useState } from "react";
import { assets, Context, environment } from "@snowbridge/api";
import { WalletAccount } from "@talismn/connect-wallets";
import { getTokenBalance } from "@/utils/balances";
import { formatBalance } from "@/utils/formatting";
import { useAtomValue } from "jotai";
import {
  assetErc20MetaDataAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";

interface BalanceDisplayProps {
  source: environment.TransferLocation;
  sourceAccount: string;
  token: string;
  displayDecimals: number;
}

export const BalanceDisplay: FC<BalanceDisplayProps> = ({
  source,
  token,
  sourceAccount,
}) => {
  const [balanceDisplay, setBalanceDisplay] = useState<string | null>(
    "Fetching...",
  );
  const environment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const assetErc20MetaData = useAtomValue(assetErc20MetaDataAtom);

  const tokenMetadata = assetErc20MetaData
    ? assetErc20MetaData[token.toLowerCase()]
    : null;

  useEffect(() => {
    if (!sourceAccount || !tokenMetadata || !context) return;
    getTokenBalance({
      context,
      token,
      ethereumChainId: BigInt(environment.ethChainId),
      source,
      sourceAccount,
    })
      .then((result) => {
        let allowance = "";
        if (result.gatewayAllowance !== undefined) {
          allowance = ` (Allowance: ${formatBalance({
            number: result.gatewayAllowance ?? 0n,
            decimals: Number(tokenMetadata.decimals),
          })} ${tokenMetadata.symbol})`;
        }
        setBalanceDisplay(
          `${formatBalance({
            number: result.balance,
            decimals: Number(tokenMetadata.decimals),
          })} ${tokenMetadata.symbol} ${allowance}`,
        );
      })
      .catch((err) => {
        console.error(err);
        setBalanceDisplay(null);
      });
  }, [source, sourceAccount, token, context, environment, tokenMetadata]);
  return (
    <div
      className={
        "text-sm text-right text-muted-foreground px-1 " +
        (sourceAccount == null ? " visible" : " hidden")
      }
    >
      Balance: {balanceDisplay ?? "Error"}
    </div>
  );
};
