"use client"

import { trimAccount } from "@/lib/utils";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { zodResolver } from "@hookform/resolvers/zod";
import { SourceType, TransferLocation } from "@snowbridge/api/dist/environment";
import { useAtomValue } from "jotai";
import { FC, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Toggle } from "./ui/toggle";
import { ethereumAccountsAtom } from "@/store/ethereum";

const onSubmit = (a: any) => {
  alert(JSON.stringify(a))
}

const formSchema = z.object({
  source: z.string().min(1, "Select source."),
  destination: z.string().min(1, "Select destination."),
  token: z.string().min(1, "Select token."),
  amount: z.coerce.number().gt(0, "Must be greater than 0."),
  beneficiary: z.string().min(1, "Select beneficiary.").regex(/^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{48})$/, "Invalid address format."),
})

export const BeneficiaryInput: FC<{ field: any, destination: TransferLocation }> = ({ field, destination }) => {
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom)
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom)
  const [beneficiaryFromWallet, setBeneficiaryFromWallet] = useState(true)

  const accounts: { key: string, name: string, type: "substrate" | "ethereum" }[] = []
  if (destination.type === "substrate") {
    polkadotAccounts?.map(x => { return { key: x.address, name: x.name || '', type: destination.type } }).forEach(x => accounts.push(x))
  }
  if (destination.type === "ethereum" || destination.has20ByteAccounts) {
    ethereumAccounts?.map(x => { return { key: x, name: x, type: "ethereum" as SourceType} }).forEach(x => accounts.push(x))
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

export const TransferForm: FC = () => {

  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);

  const [source, setSource] = useState(snowbridgeEnvironment.locations[0])
  const [destinations, setDestinations] = useState(source.destinationIds.map(d => snowbridgeEnvironment.locations.find(s => d === s.id)!))
  const [destination, setDestination] = useState(destinations[0])

  const tokens = Object.keys(destination.erc20tokensReceivable)
  const [token, setToken] = useState(destination.erc20tokensReceivable[tokens[0]])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: source.id,
      destination: destination.id,
      token: token,
      beneficiary: "",
      amount: 0,
    },
  })

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
    const newToken = newTokens.find(x=> x == watchToken) ?? newTokens[0]
    form.resetField("destination", { defaultValue: newDestination.id })
    form.resetField("beneficiary", { defaultValue: "" })
    form.resetField("token", { defaultValue: newToken })
  }, [source, watchSource, watchDestination, watchToken, setSource, setDestinations, setDestination, setToken])

  return (
    <Card className="w-auto md:w-2/3">
      <CardHeader>
        <CardTitle>Transfer</CardTitle>
        <CardDescription>Transfer tokens to Polkadot.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
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
                        <Input type="number" placeholder="0" {...field} />
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
            <FormField
              control={form.control}
              name="beneficiary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficiary</FormLabel>
                  <FormDescription>Receiver account on the destination.</FormDescription>
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
  )
}