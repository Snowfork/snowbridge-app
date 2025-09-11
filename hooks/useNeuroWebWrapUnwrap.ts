import { RegistryContext } from "@/app/providers";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { NEURO_WEB_PARACHAIN, SignerInfo } from "@/utils/types";
import { ApiPromise } from "@polkadot/api";
import { SignerOptions, SubmittableExtrinsic } from "@polkadot/api/types";
import { EventRecord } from "@polkadot/types/interfaces";
import { ISubmittableResult, Signer } from "@polkadot/types/types";
import { u8aToHex } from "@polkadot/util";
import { Context } from "@snowbridge/api";
import { NeurowebParachain } from "@snowbridge/api/dist/parachains/neuroweb";
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
  provider: ApiPromise,
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
            }
          }
          resolve({
            ...result,
            success: false,
          });
        }
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

async function fetchNeuroWebBalance([context, registry, beneficiary]: [
  Context,
  AssetRegistry,
  string?,
]) {
  if (!beneficiary) return 0n;
  const provider = await context.parachain(NEURO_WEB_PARACHAIN);
  const info = registry.parachains[NEURO_WEB_PARACHAIN].info;
  const para = new NeurowebParachain(
    provider,
    NEURO_WEB_PARACHAIN,
    info.specName,
    info.specVersion,
  );
  return await para.snowTRACBalance(beneficiary, registry.ethChainId);
}

async function doWrap(
  context: Context,
  registry: AssetRegistry,
  { polkadotAccount }: SignerInfo,
  beneficiary: string,
  amount: bigint,
) {
  if (!polkadotAccount) {
    throw Error(`Polkadot Wallet not connected.`);
  }
  if (polkadotAccount.address !== beneficiary) {
    throw Error(`Source account mismatch.`);
  }
  const provider = await context.parachain(NEURO_WEB_PARACHAIN);
  const tx = provider.tx.wrapper.tracWrap(amount);
  const result = await signAndSend(provider, tx, beneficiary, {
    signer: polkadotAccount.signer! as Signer,
    withSignedTransaction: true,
  });
  return result;
}

async function doUnwrap(
  context: Context,
  registry: AssetRegistry,
  { polkadotAccount }: SignerInfo,
  beneficiary: string,
  amount: bigint,
) {
  if (!polkadotAccount) {
    throw Error(`Polkadot Wallet not connected.`);
  }
  if (polkadotAccount.address !== beneficiary) {
    throw Error(`Source account mismatch.`);
  }
  const provider = await context.parachain(NEURO_WEB_PARACHAIN);
  const tx = provider.tx.wrapper.tracUnwrap(amount);
  const result = await signAndSend(provider, tx, beneficiary, {
    signer: polkadotAccount.signer! as Signer,
    withSignedTransaction: true,
  });
  return result;
}

export function useNeuroWebBalance(beneficiary?: string) {
  const context = useAtomValue(snowbridgeContextAtom)!;
  const registry = useContext(RegistryContext)!;
  return useSWR(
    [context, registry, beneficiary, "neuroWebBalance"],
    fetchNeuroWebBalance,
    {
      revalidateOnFocus: false,
      errorRetryCount: 10,
      fallbackData: 0n,
    },
  );
}

export function useNeuroWebWrapUnwrap() {
  const context = useAtomValue(snowbridgeContextAtom)!;
  const registry = useContext(RegistryContext)!;
  const unwrap = useCallback(
    async (signerInfo: SignerInfo, beneficiary: string, amount: bigint) =>
      doUnwrap(context, registry, signerInfo, beneficiary, amount),
    [context, registry],
  );

  const wrap = useCallback(
    (signerInfo: SignerInfo, beneficiary: string, amount: bigint) =>
      doWrap(context, registry, signerInfo, beneficiary, amount),
    [context, registry],
  );

  return {
    unwrap,
    wrap,
  };
}
