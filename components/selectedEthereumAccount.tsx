import { useConnectEthereumWallet } from "@/hooks/useConnectEthereumWallet"
import { useSwitchEthereumNetwork } from "@/hooks/useSwitchEthereumNetwork"
import { trimAccount } from "@/lib/utils"
import { ethereumAccountAtom, ethereumChainIdAtom } from "@/store/ethereum"
import { snowbridgeContextEthChainIdAtom } from "@/store/snowbridge"
import { useAtomValue } from "jotai"
import { Button } from "./ui/button"
import { toast } from "sonner"
import { BusyDialog } from "./busyDialog"
import { ErrorDialog } from "./errorDialog"

export const SelectedEthereumWallet = () => {
    const ethereumAccount = useAtomValue(ethereumAccountAtom)
    const [connectToEthereumWallet, ethereumLoading, ethereumError] = useConnectEthereumWallet()
    const ethereumChainId = useAtomValue(ethereumChainIdAtom)
    const contextEthereumChainId = useAtomValue(snowbridgeContextEthChainIdAtom)!
    const switchEthereumNetwork = useSwitchEthereumNetwork(contextEthereumChainId)

    if (!ethereumAccount) {
        return (<Button className="w-full" type="button" onClick={connectToEthereumWallet}>Connect Ethereum</Button>)
    }
    if (contextEthereumChainId !== null && ethereumChainId !== contextEthereumChainId) {
        return (<>
            <Button className="w-full" type="button" variant="destructive" onClick={switchEthereumNetwork}>Switch Network</Button>
        </>)
    }
    return (<>
        <div className="text-xs">
            <Button type="button" className="w-full" variant="outline" onClick={() => {
                toast.info("Select account in wallet.", {
                    position: "bottom-center",
                    closeButton: true,
                    dismissible: true,
                    id: "wallet_select",
                })
            }}><pre className="inline md:hidden">{trimAccount(ethereumAccount)}</pre><pre className="hidden md:inline truncate text-ellipsis">{ethereumAccount}</pre></Button>
        </div>
        <BusyDialog open={ethereumLoading} title="Ethereum Wallet" description="Waiting for Ethereum wallet..." />
        <ErrorDialog open={!ethereumLoading && ethereumError !== null} title="Ethereum Wallet Error" description={ethereumError || 'Unknown Error.'} />
    </>)
}