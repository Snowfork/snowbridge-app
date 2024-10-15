import { FC, useEffect, useState } from "react";
import { assets, Context, environment } from "@snowbridge/api";
import { WalletAccount } from "@talismn/connect-wallets";
import { getTokenBalance } from "@/utils/balances";
import { formatBalance } from "@/utils/formatting";

interface BalanceDisplayProps {
  source: environment.TransferLocation;
  ethereumAccount: string | null;
  polkadotAccount: WalletAccount | null;
  token: string;
  context: Context;
  displayDecimals: number;
  environment: environment.SnowbridgeEnvironment;
  assetErc20MetaData: {
    [tokenAddress: string]: assets.ERC20Metadata;
  };
}

export const BalanceDisplay: FC<BalanceDisplayProps> = ({
  source,
  ethereumAccount,
  polkadotAccount,
  context,
  token,
  environment,
  assetErc20MetaData,
}) => {
  const [balanceDisplay, setBalanceDisplay] = useState<string | null>(
    "Fetching...",
  );

  const tokenMetadata = assetErc20MetaData[token.toLowerCase()];
  const sourceAccount =
    source.type == "ethereum"
      ? (ethereumAccount ?? undefined)
      : polkadotAccount?.address;

  useEffect(() => {
    if (!sourceAccount) return;
    if (!tokenMetadata) return;
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
  }, [
    source,
    ethereumAccount,
    polkadotAccount,
    token,
    context,
    environment,
    sourceAccount,
    tokenMetadata,
  ]);
  return (
    <div
      className={
        "text-sm text-right text-muted-foreground px-1 " +
        ((source.type == "ethereum" && ethereumAccount !== null) ||
        (source.type == "substrate" && polkadotAccount !== null)
          ? " visible"
          : " hidden")
      }
    >
      Balance: {balanceDisplay ?? "Error"}
    </div>
  );
};
