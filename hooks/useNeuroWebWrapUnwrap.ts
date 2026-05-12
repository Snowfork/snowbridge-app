import { BridgeInfoContext } from "@/app/providers";
import { type SnowbridgeContext } from "@/lib/snowbridge";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { NEURO_WEB_PARACHAIN, SignerInfo } from "@/utils/types";
import { SignerOptions, SubmittableExtrinsic } from "@polkadot/api/types";
import { EventRecord } from "@polkadot/types/interfaces";
import { ISubmittableResult } from "@polkadot/types/types";
import { u8aToHex } from "@polkadot/util";
import { NeurowebParachain } from "@snowbridge/api";
import { AssetRegistry } from "@snowbridge/base-types";
import { useAtomValue } from "jotai";
import { useCallback, useContext } from "react";
import useSWR from "swr";

export type Receipt = {
  blockNumber: number;
  blockHash: string;
  txIndex: number;
  txHash: string;
  success: boolean;
  events: EventRecord[];
  dispatchError?: any;
};

async function signAndSend(
  provider: any,
  tx: SubmittableExtrinsic<"promise", ISubmittableResult>,
  account: string,
  options: Partial<SignerOptions>,
): Promise<Receipt> {
  const result = await new Promise<Receipt>((resolve, reject) => {
    try {
      tx.signAndSend(account, options, (c) => {
        if (c.isError) {
          console.error(c);
          reject(c.internalError || c.dispatchError || c);
          return;
        }
        if (c.isFinalized) {
          const result = {
            txHash: u8aToHex(c.txHash),
            txIndex: c.txIndex || 0,
            blockNumber: Number((c as any).blockNumber),
            blockHash: "",
            events: c.events,
          };
          for (const e of c.events) {
            if (provider.events.system.ExtrinsicFailed.is(e.event)) {
              resolve({
                ...result,
                success: false,
                dispatchError: (e.event.data.toHuman(true) as any)
                  ?.dispatchError,
              });
              return;
            }
          }
          resolve({
            ...result,
            success: true,
          });
        }
      }).catch((error) => {
        console.error(error);
        reject(error);
      });
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });

  result.blockHash = u8aToHex(
    await provider.rpc.chain.getBlockHash(result.blockNumber),
  );

  return result;
}

export async function fetchNeuroWebBalance([context, registry, beneficiary]: [
  SnowbridgeContext,
  AssetRegistry,
  string?,
]) {
  if (!beneficiary || !context) return undefined;
  const provider = (await context.parachain(NEURO_WEB_PARACHAIN)) as any;
  const info = registry.parachains[`polkadot_${NEURO_WEB_PARACHAIN}`].info;
  const para = new NeurowebParachain(
    provider,
    NEURO_WEB_PARACHAIN,
    info.specName,
    info.specVersion,
  );
  return {
    bridgedTracBalance: await para.snowTRACBalance(
      beneficiary,
      registry.ethChainId,
    ),
    neuroTracBalance: await para.tracBalance(beneficiary),
    nativeBalance: await para.getNativeBalance(beneficiary),
  };
}

async function doWrap(
  context: SnowbridgeContext,
  { polkadotAccount }: SignerInfo,
  amount: bigint,
) {
  if (!polkadotAccount) {
    throw Error(`Polkadot Wallet not connected.`);
  }
  const provider = (await context.parachain(NEURO_WEB_PARACHAIN)) as any;
  const tx = provider.tx.wrapper.tracWrap(amount);
  const result = await signAndSend(provider, tx, polkadotAccount.address, {
    signer: polkadotAccount.signer as any,
    withSignedTransaction: true,
  });
  return result;
}

async function doUnwrap(
  context: SnowbridgeContext,
  { polkadotAccount }: SignerInfo,
  amount: bigint,
) {
  if (!polkadotAccount) {
    throw Error(`Polkadot Wallet not connected.`);
  }
  const provider = (await context.parachain(NEURO_WEB_PARACHAIN)) as any;
  const tx = provider.tx.wrapper.tracUnwrap(amount);
  const result = await signAndSend(provider, tx, polkadotAccount.address, {
    signer: polkadotAccount.signer as any,
    withSignedTransaction: true,
  });
  return result;
}

export function useNeuroWebBalance(beneficiary?: string) {
  const context = useAtomValue(snowbridgeContextAtom)!;
  const { registry } = useContext(BridgeInfoContext)!;
  return useSWR(
    [context, registry, beneficiary, "neuroWebBalance"],
    fetchNeuroWebBalance,
    {
      revalidateOnFocus: false,
      errorRetryCount: 10,
    },
  );
}

export function useNeuroWebWrapUnwrap() {
  const context = useAtomValue(snowbridgeContextAtom)!;
  const unwrap = useCallback(
    async (signerInfo: SignerInfo, amount: bigint) =>
      doUnwrap(context, signerInfo, amount),
    [context],
  );

  const wrap = useCallback(
    (signerInfo: SignerInfo, amount: bigint) =>
      doWrap(context, signerInfo, amount),
    [context],
  );

  return {
    unwrap,
    wrap,
  };
}
