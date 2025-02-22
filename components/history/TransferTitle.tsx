import { Transfer } from "@/store/transferHistory";
import { assets, assetsV2, environment } from "@snowbridge/api";
import { LucideGlobe, LucideWallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBalance } from "@/utils/formatting";
import { parseUnits } from "ethers";
import { useAtomValue } from "jotai";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { TransferStatusBadge } from "./TransferStatusBadge";
import { useAssetRegistry } from "@/hooks/useAssetRegistry";

export function getEnvDetail(
  transfer: Transfer,
  registry: assetsV2.AssetRegistry,
) {
  if (transfer.info.destinationParachain === undefined) {
    return assetsV2.getEthereumTransferLocation(
      registry,
      registry.ethereumChains[registry.ethChainId],
    );
  }

  let destination = registry.parachains[transfer.info.destinationParachain];

  if (destination === undefined) {
    destination = registry.parachains[registry.assetHubParaId];
  }
  return assetsV2.getSubstrateTransferLocation(destination);
}

export function formatTokenData(
  transfer: Transfer,
  assetErc20MetaData: { [token: string]: assets.ERC20Metadata },
  displayDecimals?: number,
) {
  const tokenAddress = transfer.info.tokenAddress.toLowerCase();
  let amount = transfer.info.amount;
  let tokenConfig =
    assetErc20MetaData[transfer.info.tokenAddress.toLowerCase()];
  let tokenName = tokenConfig.name;
  const metaData =
    tokenAddress in assetErc20MetaData
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

  const destination = getEnvDetail(transfer, assetRegistry);
  const when = new Date(transfer.info.when);

  const { tokenName, amount } = formatTokenData(
    transfer,
    assetRegistry.ethereumChains[assetRegistry.ethChainId].assets,
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
