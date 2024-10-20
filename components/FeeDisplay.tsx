import {
  relayChainNativeAssetAtom,
  snowbridgeContextAtom,
} from "@/store/snowbridge";
import { formatBalance } from "@/utils/formatting";
import { Context, toEthereum, toPolkadot } from "@snowbridge/api";
import { environment, assets } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { FC, useEffect, useState } from "react";

interface FeeDisplayProps {
  source: "substrate" | "ethereum";
  destination: environment.TransferLocation;
  token: string;
  displayDecimals: number;
}

export const FeeDisplay: FC<FeeDisplayProps> = ({
  source,
  destination,
  token,
  displayDecimals,
}) => {
  const context = useAtomValue(snowbridgeContextAtom);
  const assetHubNativeToken = useAtomValue(relayChainNativeAssetAtom);

  const [feeDisplay, setFeeDisplay] = useState<string | null>("Fetching...");

  useEffect(() => {
    if (context === null) return;
    switch (source) {
      case "substrate": {
        toEthereum
          .getSendFee(context)
          .then((fee) => {
            setFeeDisplay(
              formatBalance({
                number: fee,
                decimals: assetHubNativeToken?.tokenDecimal ?? 0,
                displayDecimals: displayDecimals,
              }) +
                " " +
                assetHubNativeToken?.tokenSymbol,
            );
          })
          .catch((err) => {
            console.error(err);
            setFeeDisplay(null);
          });
        break;
      }
      case "ethereum": {
        if (destination.paraInfo === undefined) {
          setFeeDisplay(null);
          break;
        }

        toPolkadot
          .getSendFee(
            context,
            token,
            destination.paraInfo.paraId,
            destination.paraInfo.destinationFeeDOT,
          )
          .then((fee) => {
            setFeeDisplay(
              formatBalance({ number: fee, decimals: 18, displayDecimals: 8 }) +
                " ETH",
            );
          })
          .catch((err: unknown) => {
            console.error(err);
            setFeeDisplay(null);
          });
        break;
      }
      default:
        setFeeDisplay(null);
        break;
    }
  }, [
    context,
    source,
    destination,
    token,
    setFeeDisplay,
    assetHubNativeToken,
    displayDecimals,
  ]);
  return (
    <div className="text-sm text-right text-muted-foreground px-1">
      Transfer Fee: {feeDisplay ?? "Error"}
    </div>
  );
};
