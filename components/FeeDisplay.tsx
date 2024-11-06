import {
  relayChainNativeAssetAtom,
  snowbridgeContextAtom,
} from "@/store/snowbridge";
import { formatBalance } from "@/utils/formatting";
import { Context, toEthereum, toPolkadot } from "@snowbridge/api";
import { environment } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { FC, useEffect, useRef, useState } from "react";

interface FeeDisplayProps {
  source: "substrate" | "ethereum";
  destination: environment.TransferLocation;
  token: string;
  displayDecimals: number;
  className?: string;
}

export const FeeDisplay: FC<FeeDisplayProps> = ({
  source,
  destination,
  token,
  displayDecimals,
  className,
}) => {
  const context = useAtomValue(snowbridgeContextAtom);
  const assetHubNativeToken = useAtomValue(relayChainNativeAssetAtom);

  const [feeDisplay, setFeeDisplay] = useState<string | null>("Fetching...");
  const request = useRef(0);

  useEffect(() => {
    if (context === null) return;
    setFeeDisplay("Fetching...");
    request.current = request.current + 1;
    const id = request.current;
    switch (source) {
      case "substrate": {
        toEthereum
          .getSendFee(context)
          .then((fee) => {
            if (request.current !== id) return;
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
            if (request.current !== id) return;
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
            if (request.current !== id) return;
            setFeeDisplay(
              formatBalance({ number: fee, decimals: 18, displayDecimals: 8 }) +
                " ETH",
            );
          })
          .catch((err: unknown) => {
            if (request.current !== id) return;
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
  return <div className={className}>{feeDisplay ?? "Error"}</div>;
};
