import { Transfer } from "@/store/transferHistory";
import { assets, environment } from "@snowbridge/api";
import { LucideGlobe, LucideWallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBalance } from "@/utils/formatting";
import { parseUnits } from "ethers";
import { useAtomValue } from "jotai";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { TransferStatusBadge } from "./TransferStatusBadge";
import { useAssetRegistry } from "@/hooks/useAssetRegistry";

function getDestinationTokenByAddress(
  tokenAddress: string,
  destination?: environment.TransferLocation,
) {
  return (destination?.erc20tokensReceivable ?? []).find(
    (token) => token.address.toLowerCase() === tokenAddress.toLowerCase(),
  );
}

export function getEnvDetail(
  transfer: Transfer,
  env: environment.SnowbridgeEnvironment,
) {
  if (transfer.info.destinationParachain === undefined) {
    return env.locations.find((loc) => loc.id === "ethereum");
  }

  let destination = env.locations.find(
    (loc) => loc.paraInfo?.paraId === transfer.info.destinationParachain,
  );

  if (
    destination === undefined &&
    transfer.info.destinationParachain !== undefined
  ) {
    destination = env.locations.find((loc) => loc.id === "assethub");
  }
  return destination;
}

export function formatTokenData(
  transfer: Transfer,
  assetErc20MetaData: { [token: string]: assets.ERC20Metadata } | null,
  destination?: environment.TransferLocation,
  displayDecimals?: number,
) {
  const tokenAddress = transfer.info.tokenAddress.toLowerCase();
  let amount = transfer.info.amount;
  let tokenConfig = getDestinationTokenByAddress(
    transfer.info.tokenAddress,
    destination,
  );
  let tokenName = tokenConfig?.id;
  const metaData =
    assetErc20MetaData !== null && tokenAddress in assetErc20MetaData
      ? assetErc20MetaData[tokenAddress]
      : null;
  if (metaData !== null) {
    amount = formatBalance({
      number: parseUnits(transfer.info.amount, 0),
      decimals: Number(metaData.decimals),
      displayDecimals: displayDecimals ?? Number(metaData.decimals),
    });
    tokenName = metaData.symbol;
  }
  return { tokenName, amount };
}

interface TransferTitleProps {
  transfer: Transfer;
  showWallet?: boolean;
  showBagde?: boolean;
}

export function TransferTitle({
  transfer,
  showWallet,
  showBagde,
}: TransferTitleProps) {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  const { data: assetRegistry } = useAssetRegistry();

  const destination = getEnvDetail(transfer, env);
  const when = new Date(transfer.info.when);

  const { tokenName, amount } = formatTokenData(
    transfer,
    assetRegistry.ethereumChains[assetRegistry.ethChainId].assets,
    destination,
  );

  if (!(showWallet ?? true) && !(showBagde ?? true)) {
    return (
      <span className="block col-span-6 place-self-start text-left">
        {amount +
          " " +
          (tokenName ?? "unknown") +
          " to " +
          (destination?.name ?? "unknown") +
          " on " +
          when.toLocaleString()}
      </span>
    );
  }
  return (
    <div className="grid grid-cols-8 justify-stretch w-full">
      <TransferStatusBadge
        className={!(showBagde ?? true) ? "hidden" : "ml-8"}
        transfer={transfer}
      />
      <div
        className={cn(
          "flex px-4 mr-2 col-span-1 w-full place-content-center",
          !(showWallet ?? true) ? "hidden" : "",
        )}
      >
        {transfer.isWalletTransaction ? <LucideWallet /> : <LucideGlobe />}
      </div>
      <p className="col-span-6 place-self-start text-left">
        {amount +
          " " +
          (tokenName ?? "unknown") +
          " to " +
          (destination?.name ?? "unknown") +
          " on " +
          when.toLocaleString()}
      </p>
    </div>
  );
}
