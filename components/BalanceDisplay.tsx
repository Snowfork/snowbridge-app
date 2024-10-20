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
import { polkadotAccountAtom } from "@/store/polkadot";
import { ethereumAccountAtom } from "@/store/ethereum";

interface BalanceDisplayProps {
  source: environment.TransferLocation;
  token: string;
  displayDecimals: number;
  tokenMetadata: assets.ERC20Metadata | null;
}

export const BalanceDisplay: FC<BalanceDisplayProps> = ({
  source,
  token,
  tokenMetadata,
}) => {
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);

  const sourceAccount =
    source.type == "ethereum"
      ? (ethereumAccount ?? undefined)
      : polkadotAccount?.address;
  const [balanceDisplay, setBalanceDisplay] = useState<string | null>(
    "Fetching...",
  );
  const environment = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);

  useEffect(() => {
    if (!sourceAccount || !context || !tokenMetadata) return;
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
        (sourceAccount !== null ? " visible" : " hidden")
      }
    >
      Balance: {balanceDisplay ?? "Error"}
    </div>
  );
};
