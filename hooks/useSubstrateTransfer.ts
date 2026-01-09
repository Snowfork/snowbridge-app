import { Location } from "@/lib/xcm";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { ApiPromise } from "@polkadot/api";
import { Signer, SubmittableExtrinsicFunction } from "@polkadot/api/types";
import { DispatchError, Hash } from "@polkadot/types/interfaces";
import { AnyTuple } from "@polkadot/types/types";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

export function useSubstrateTransfer() {
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

  const transferAsset = useCallback(
    async (
      sourceParachain: number | "relaychain",
      sourceAccount: string,
      destination: Location,
      beneficiary: Location,
      asset: Location,
      amount: bigint,
    ) => {
      if (context === null) {
        throw Error(`Provider or context has changed.`);
      }

      const allAccounts = [...(polkadotAccounts ?? [])];
      if (polkadotAccount) {
        allAccounts.push(polkadotAccount);
      }
      const walletSigner = allAccounts.find(
        (acc) => acc.address === sourceAccount,
      );
      if (!walletSigner) {
        throw Error(`Could not resolve signer for '${sourceAccount}'.`);
      }

      let api: ApiPromise | undefined;

      let transferAssets:
        | SubmittableExtrinsicFunction<"promise", AnyTuple>
        | undefined;

      if (sourceParachain === "relaychain") {
        api = await context.relaychain();
        if (!api) throw Error(`Cannot resolve parachain '${sourceParachain}'.`);
        transferAssets = api.tx.xcmPallet?.transferAssets;
        if (!transferAssets)
          throw Error(
            `Cannot resolve resolve transfer function 'polkadotXcm.transferAssets'.`,
          );
      } else {
        api = await context.parachain(sourceParachain);
        if (!api) throw Error(`Cannot resolve parachain '${sourceParachain}'.`);
        transferAssets = api.tx.polkadotXcm?.transferAssets;
        if (!transferAssets)
          throw Error(
            `Cannot resolve resolve transfer function 'polkadotXcm.transferAssets'.`,
          );
      }
      // dest, ben, ass, fee, weight
      const xcmVersion = "V4";
      const feeAsset = 0;
      const weight = "Unlimited";
      const assetLocation = api.createType("StagingXcmV4Location", asset);
      const pDestination: { [key: string]: any } = {};
      pDestination[xcmVersion] = api.createType(
        "StagingXcmV4Location",
        destination,
      );
      const pAssets: { [key: string]: any } = {};
      pAssets[xcmVersion] = [
        {
          id: { Concrete: assetLocation },
          fun: { Fungible: amount },
        },
      ];
      const pBeneficiary: { [key: string]: any } = {};
      pBeneficiary[xcmVersion] = beneficiary;

      let unsubFn: (() => void) | undefined;
      const result = await new Promise<{
        unsub: () => void;
        data: {
          txHash: Hash;
          txIndex?: number;
          blockHash: Hash;
          error?: DispatchError;
        };
      }>((resolve, reject) => {
        transferAssets(pDestination, pBeneficiary, pAssets, feeAsset, weight)
          .signAndSend(
            sourceAccount,
            {
              signer: walletSigner.signer as Signer,
            },
            (cb) => {
              if (cb.isError) {
                console.error(cb);
                reject(cb.internalError ?? cb.dispatchError ?? cb);
              }
              if (cb.isFinalized) {
                resolve({
                  unsub: unsubFn ?? (() => undefined),
                  data: {
                    txHash: cb.txHash,
                    txIndex: cb.txIndex,
                    blockHash: cb.status.asFinalized,
                    error: cb.dispatchError,
                  },
                });
              }
            },
          )
          .then((unsub) => {
            unsubFn = unsub;
          })
          .catch((err) => reject(err));
      });

      result.unsub();
      const header: any = await api.rpc.chain.getHeader(result.data.blockHash);
      return { ...result.data, blockNumber: header.number };
    },
    [context, polkadotAccount, polkadotAccounts],
  );

  return { transferAsset };
}
