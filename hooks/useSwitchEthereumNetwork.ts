import { ethereumChainIdAtom, windowEthereumAtom } from "@/store/ethereum";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

export const useSwitchEthereumNetwork = (): {
  shouldSwitchNetwork: boolean;
  switchNetwork: () => Promise<void>;
} => {
  const snowbridgeEnv = useAtomValue(snowbridgeEnvironmentAtom);
  const ethereum = useAtomValue(windowEthereumAtom);
  const providerChainID = useAtomValue(ethereumChainIdAtom);
  const envChainId = snowbridgeEnv.ethChainId;
  const shouldSwitchNetwork = providerChainID !== envChainId;

  const switchNetwork = useCallback(async () => {
    if (!shouldSwitchNetwork || ethereum === null) {
      return;
    }
    const chainIdHex = `0x${envChainId.toString(16)}`;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError) {
      if ((switchError as { code: number }).code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
            },
          ],
        });
      }
    }
  }, [shouldSwitchNetwork, ethereum, envChainId]);

  return {
    shouldSwitchNetwork,
    switchNetwork,
  };
};
