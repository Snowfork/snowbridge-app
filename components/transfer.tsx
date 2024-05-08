"use client"

import { formatNumber, trimAccount } from "@/lib/utils";
import { ethereumAccountsAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeContextAtom, snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { FormData, Transfer, TransferStatus, TransferUpdate, transfersAtom } from "@/store/transferHistory";
import { zodResolver } from "@hookform/resolvers/zod";
import { Context, environment, toEthereum, toPolkadot } from "@snowbridge/api";
import { WalletAccount } from "@talismn/connect-wallets";
import { BrowserProvider } from "ethers";
import { useAtom, useAtomValue } from "jotai";
import { LucideAlertCircle, LucideLoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Toggle } from "./ui/toggle";

type AppRouter = ReturnType<typeof useRouter>
type ValidationError = toPolkadot.SendValidationError | toEthereum.SendValidationError

const formSchema = z.object({
  source: z.string().min(1, "Select source."),
  destination: z.string().min(1, "Select destination."),
  token: z.string().min(1, "Select token."),
  amount: z.string().regex(/^[1-9][0-9]{0,37}$/, "Invalid amount"),
  beneficiary: z.string().min(1, "Select beneficiary.").regex(/^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{48})$/, "Invalid address format."),
})

const doApproveSpend = async (context: Context | null, ethereumProvider: BrowserProvider | null, token: string, amount: bigint): Promise<void> => {
  if (context == null || ethereumProvider == null) return;

  const signer = await ethereumProvider.getSigner()
  const response = await toPolkadot.approveTokenSpend(context, signer, token, amount)

  console.log("approval response", response)
  const receipt = await response.wait()
  console.log("approval receipt", receipt)
  if (receipt?.status === 0) { // check success
    throw Error('Token spend approval failed.')
  }
}

const doDepositAndApproveWeth = async (context: Context | null, ethereumProvider: BrowserProvider | null, token: string, amount: bigint): Promise<void> => {
  if (context == null || ethereumProvider == null) return;

  const signer = await ethereumProvider.getSigner()
  const response = await toPolkadot.depositWeth(context, signer, token, amount)
  console.log("deposit response", response)
  const receipt = await response.wait()
  console.log("depoist receipt", receipt)
  if (receipt?.status === 0) { // check success
    throw Error('Token deposit failed.')
  }

  return await doApproveSpend(context, ethereumProvider, token, amount)
};

const BusyDialog: FC<{
  description: string,
  dismiss?: () => void,
}> = ({ description, dismiss }) => {
  return (<Dialog open={description?.length > 0} onOpenChange={(a) => { if (!a && dismiss) dismiss() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Busy</DialogTitle>
        <DialogDescription className="flex items-center py-2">
          <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
          {description}
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>)
}

type ErrorInfo = {
  title: string,
  description: string,
  errors: ValidationError[],
}

const tokenName = (erc20tokensReceivable: { [name: string]: string }, formData: FormData): string | undefined => {
  const token = Object.entries(erc20tokensReceivable).find(kv => kv[1] == formData.token)
  return token !== undefined ? token[0] : undefined
}

const ErrorDialog: FC<{
  info: ErrorInfo | null
  formData: FormData,
  destination: environment.TransferLocation,
  onDepositAndApproveWeth: () => Promise<void>,
  onApproveSpend: () => Promise<void>,
  dismiss: () => void,
}> = ({ info, formData, destination, dismiss, onDepositAndApproveWeth, onApproveSpend }) => {

  const fixAction = (error: ValidationError): JSX.Element => {
    const token = tokenName(destination.erc20tokensReceivable, formData)

    if (error.code === toPolkadot.SendValidationCode.InsufficientToken && token === "WETH") {
      return (<Button className="text-blue-600 py-0 h-auto" variant="link" onClick={onDepositAndApproveWeth}>Fix</Button>)
    }
    if (error.code === toPolkadot.SendValidationCode.ERC20SpendNotApproved) {
      return (<Button className="text-blue-600 py-0 h-auto" variant="link" onClick={onApproveSpend}>Fix</Button>)
    }
    return (<></>)
  }
  let errorList = (<></>)
  if ((info?.errors.length || 0) > 0) {
    errorList = (<ol className="list-inside list-disc">
      {info?.errors.map((e, i) => (<li key={i}>{e.message}{fixAction(e)}</li>))}
    </ol>)
  }
  return (<Dialog open={info !== null} onOpenChange={(a) => { if (!a) dismiss() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{info?.title}</DialogTitle>
        <DialogDescription className="flex items-center py-2">
          <LucideAlertCircle className="mx-2 text-destructive" />
          {info?.description}
        </DialogDescription>
        {errorList}
      </DialogHeader>
    </DialogContent>
  </Dialog>)
}

export const BeneficiaryInput: FC<{ field: any, destination: environment.TransferLocation }> = ({ field, destination }) => {
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom)
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom)
  const [beneficiaryFromWallet, setBeneficiaryFromWallet] = useState(true)

  const accounts: { key: string, name: string, type: "substrate" | "ethereum" }[] = []
  if (destination.type === "substrate") {
    polkadotAccounts?.map(x => { return { key: x.address, name: x.name || '', type: destination.type } }).forEach(x => accounts.push(x))
  }
  if (destination.type === "ethereum" || destination.paraInfo?.has20ByteAccounts === true) {
    ethereumAccounts?.map(x => { return { key: x, name: x, type: "ethereum" as environment.SourceType } }).forEach(x => accounts.push(x))
  }

  let input: JSX.Element
  if (beneficiaryFromWallet && accounts.length > 0) {
    input = (<Select key="controlled" onValueChange={field.onChange} value={field.value}>
      <SelectTrigger>
        <SelectValue placeholder="Select a beneficiary" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {accounts.map((acc, i) =>
            acc.type === "substrate"
              ? (<SelectItem key={acc.key + "-" + i} value={acc.key}>
                <div>{acc.name}</div>
                <pre className="md:hidden inline">{trimAccount(acc.key, 18)}</pre>
                <pre className="hidden md:inline">{acc.key}</pre>
              </SelectItem>)
              : (<SelectItem key={acc.key + "-" + i} value={acc.key}>
                <pre className="md:hidden inline">{trimAccount(acc.name, 18)}</pre>
                <pre className="hidden md:inline">{acc.name}</pre>
              </SelectItem>))}
        </SelectGroup>
      </SelectContent>
    </Select>)
  } else {
    input = (<Input key="plain" placeholder="0x0000000000000000000000000000000000000000" {...field} />)
  }

  return (<>
    {input}
    <div className="flex justify-end">
      <Toggle defaultPressed={false} pressed={!beneficiaryFromWallet} onPressedChange={(p) => setBeneficiaryFromWallet(!p)} className="text-xs">Input beneficiary manually.</Toggle>
    </div>
  </>)
}

const onSubmit = (
  context: Context | null,
  source: environment.TransferLocation,
  destination: environment.TransferLocation,
  setError: Dispatch<SetStateAction<ErrorInfo | null>>,
  setBusyMessage: Dispatch<SetStateAction<string>>,
  polkadotAccount: WalletAccount | null,
  ethereumProvider: BrowserProvider | null,
  [transfers, setTransfer]: [Transfer[], ((_: TransferUpdate) => void)],
  appRouter: AppRouter,
  form: UseFormReturn<any>
): ((data: FormData) => Promise<void>) => {
  return async (data) => {
    try {
      if (source.id !== data.source) throw Error(`Invalid form state: source mismatch ${source.id} and ${data.source}.`)
      if (destination.id !== data.destination) throw Error(`Invalid form state: source mismatch ${destination.id} and ${data.destination}.`)
      if (context === null) throw Error(`Context not connected.`)

      setBusyMessage("Sending")
      const transferId = crypto.randomUUID()
      switch (source.type) {
        case "substrate":
          {
            if (destination.type !== "ethereum") throw Error(`Invalid form state: destination type mismatch.`)
            if (source.paraInfo === undefined) throw Error(`Invalid form state: source does not have parachain info.`)
            if (polkadotAccount === null) throw Error(`Wallet not connected.`)
            const walletSigner = { address: polkadotAccount.address, signer: polkadotAccount.signer }
            const plan = await toEthereum.validateSend(context, walletSigner as any, source.paraInfo.paraId, data.beneficiary, data.token, BigInt(data.amount))
            console.log(plan)
            if (plan.failure) {
              setBusyMessage("")
              setError({ title: "Send Plan Failed", description: "Some preflight checks failed when planning the transfer.", errors: plan.failure.errors })
              return;
            }

            const result = await toEthereum.send(context, walletSigner as any, plan)
            console.log(result)
            setTransfer({ action: "add", transfer: { id: transferId, when: new Date().toISOString(), status: TransferStatus.InProgress, tokenName: tokenName(destination.erc20tokensReceivable, data) ?? "unknown", form: data, data: result } })
            break;
          }
        case "ethereum":
          {
            if (destination.type !== "substrate") throw Error(`Invalid form state: destination type mismatch.`)
            if (destination.paraInfo === undefined) throw Error(`Invalid form state: destination does not have parachain id.`)
            if (ethereumProvider === null) throw Error(`Wallet not connected.`)
            const signer = await ethereumProvider.getSigner()
            const plan = await toPolkadot.validateSend(context, signer, data.beneficiary, data.token, destination.paraInfo.paraId, BigInt(data.amount), destination.paraInfo.destinationFeeDOT)
            console.log(plan)
            if (plan.failure) {
              setBusyMessage("")
              setError({ title: "Send Plan Failed", description: "Some preflight checks failed when planning the transfer.", errors: plan.failure.errors })
              return;
            }

            const result = await toPolkadot.send(context, signer, plan)
            console.log(result)
            setTransfer({ action: "add", transfer: { id: transferId, when: new Date().toISOString(), status: TransferStatus.InProgress, tokenName: tokenName(destination.erc20tokensReceivable, data) ?? "unknown", form: data, data: result } })
            break;
          }
        default:
          throw Error(`Invalid form state: cannot infer source type.`)
      }
      form.reset()
      const transferUrl = `/history#${transferId}`
      appRouter.prefetch(transferUrl)
      toast.info("Transfer Successful", {
        position: "bottom-center",
        closeButton: true,
        id: "transfer_success",
        description: 'Token transfer was succesfully initiated.',
        important: true,
        action: {
          label: "View",
          onClick: () => {
            appRouter.push(transferUrl)
          },
        },
      })
      setBusyMessage("")
    } catch (err: any) {
      console.error(err)
      console.log()
      let reason = 'unknonwn'
      if(err)  {
        reason = err.reason || err.message
      }
      setBusyMessage("")
      setError({ title: "Send Error", description: `Error occured while trying to send transaction. Reason: ${reason}`, errors: [] })
    }
  }
}

export const TransferForm: FC = () => {
  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom)
  const context = useAtomValue(snowbridgeContextAtom)
  const ethereumProvider = useAtomValue(ethersProviderAtom)
  const polkadotAccount = useAtomValue(polkadotAccountAtom)
  const transferHistory = useAtom(transfersAtom)
  const router = useRouter()

  const [error, setError] = useState<ErrorInfo | null>(null)
  const [busyMessage, setBusyMessage] = useState("")
  const [source, setSource] = useState(snowbridgeEnvironment.locations[0])
  const [destinations, setDestinations] = useState(source.destinationIds.map(d => snowbridgeEnvironment.locations.find(s => d === s.id)!))
  const [destination, setDestination] = useState(destinations[0])

  const tokens = Object.keys(destination.erc20tokensReceivable)
  const [token, setToken] = useState(destination.erc20tokensReceivable[tokens[0]])
  const [feeDisplay, setFeeDisplay] = useState<string>("unknown")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: source.id,
      destination: destination.id,
      token: token,
      beneficiary: "",
      amount: "0",
    },
  })

  useEffect(() => {
    if (context == null) return
    switch (source.type) {
      case "substrate": {
        toEthereum.getSendFee(context)
          .then(fee => {
            setFeeDisplay(formatNumber(fee, source.paraInfo?.decimals) + " DOT")
          })
          .catch(err => {
            console.error(err)
            setFeeDisplay("unknown")
            setError({ title: "Error", description: "Could not fetch transfer fee.", errors: [] })
          })
        break;
      }
      case "ethereum": {
        if (destination.paraInfo === undefined) {
          setFeeDisplay("unknown")
          setError({ title: "Error", description: "Destination fee is not configured.", errors: [] })
          break;
        }

        toPolkadot.getSendFee(context, token, destination.paraInfo.paraId, destination.paraInfo.destinationFeeDOT)
          .then(fee => {
            setFeeDisplay(formatNumber(fee, 18) + " ETH")
          })
          .catch(err => {
            console.error(err)
            setFeeDisplay("unknown")
            setError({ title: "Error", description: "Could not fetch transfer fee.", errors: [] })
          })

        break;
      }
      default:
        setError({ title: "Error", description: "Could not fetch transfer fee.", errors: [] })
    }
  }, [context, source, destination, token, setFeeDisplay, setError])

  const watchToken = form.watch("token")
  const watchSource = form.watch("source")
  const watchDestination = form.watch("destination")

  useEffect(() => {
    let newDestinations = destinations
    if (source.id !== watchSource) {
      const newSource = snowbridgeEnvironment.locations.find(s => s.id == watchSource)!;
      setSource(newSource)
      newDestinations = newSource.destinationIds.map(d => snowbridgeEnvironment.locations.find(s => d === s.id)).filter(s => s !== undefined).map(s => s!)
      setDestinations(newDestinations)
    }
    const newDestination = newDestinations.find(d => d.id == watchDestination) ?? newDestinations[0]
    setDestination(newDestination)
    const newTokens = Object.values(newDestination.erc20tokensReceivable)
    const newToken = newTokens.find(x => x == watchToken) ?? newTokens[0]
    form.resetField("destination", { defaultValue: newDestination.id })
    form.resetField("beneficiary", { defaultValue: "" })
    form.resetField("token", { defaultValue: newToken })
  }, [form, source, destinations, watchSource, snowbridgeEnvironment, watchDestination, watchToken, setSource, setDestinations, setDestination, setToken])

  const depositAndApproveWeth = useCallback(async () => {
    const toastTitle = "Deposit and Approve Token Spend"
    setBusyMessage("Depositing and approving spend...")
    try {
      const formData = form.getValues()
      await doDepositAndApproveWeth(context, ethereumProvider, formData.token, BigInt(formData.amount))
      toast.info(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        id: "deposit_approval_result",
        description: 'Token spend approval was succesful.',
        important: true,
      })
    }
    catch (err: any) {
      console.error(err)
      const errorMessage = `Action Failed: reason: ${err.reason || err.message}`
      toast.error(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        duration: 20000,
        id: "deposit_approval_result",
        description: errorMessage,
        important: true,
      })
    }
    finally { setBusyMessage(""); setError(null) }
  }, [context, ethereumProvider, form, setBusyMessage, setError])

  const approveSpend = useCallback(async () => {
    const toastTitle = "Approve Token Spend"
    setBusyMessage("Approving spend...")
    try {
      const formData = form.getValues()
      await doApproveSpend(context, ethereumProvider, formData.token, BigInt(formData.amount))
      toast.info(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        id: "approval_result",
        description: 'Token spend approval was succesful.',
        important: true,
      })
    }
    catch (err: any) {
      console.error(err)
      const errorMessage = `Action Failed: reason: ${err.reason || err.message}`
      toast.error(toastTitle, {
        position: "bottom-center",
        closeButton: true,
        duration: 20000,
        id: "approval_result",
        description: errorMessage,
        important: true,
      })
    }
    finally { setBusyMessage(""); setError(null) }
  }, [context, ethereumProvider, form, setBusyMessage, setError])

  return (
    <>
      <Card className="w-auto md:w-2/3">
        <CardHeader>
          <CardTitle>Transfer</CardTitle>
          <CardDescription className="hidden md:flex">Transfer tokens between Ethereum and Polkadot parachains.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit(context, source, destination, setError, setBusyMessage, polkadotAccount, ethereumProvider, transferHistory, router, form))} className="space-y-2">
              <div className="grid grid-cols-2 space-x-2">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem {...field}>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {snowbridgeEnvironment.locations.filter(s => s.destinationIds.length > 0).map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger >
                            <SelectValue placeholder="Select a destination" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {destinations.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex space-x-2">
                <div className="w-2/3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="string" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
                <div className="w-1/3">
                  <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="invisible">Token</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a token" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {Object.entries(destination.erc20tokensReceivable).map(tk => (
                                  <SelectItem key={tk[1]} value={tk[1]} >{tk[0]}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                            <FormMessage />
                          </Select>
                        </FormControl>
                      </FormItem>
                    )} />
                </div>
              </div>
              <div className="text-xs text-right text-muted-foreground px-1">Fee: {feeDisplay}</div>
              <FormField
                control={form.control}
                name="beneficiary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beneficiary</FormLabel>
                    <FormDescription className="hidden md:flex">Receiver account on the destination.</FormDescription>
                    <FormControl>
                      <BeneficiaryInput field={field} destination={destination} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <br />
              <Button className="w-full my-8" type="submit">Submit</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <BusyDialog description={busyMessage} />
      <ErrorDialog
        info={error}
        formData={form.getValues()}
        destination={destination}
        onDepositAndApproveWeth={depositAndApproveWeth}
        onApproveSpend={approveSpend}
        dismiss={() => setError(null)} />
    </>
  )
}