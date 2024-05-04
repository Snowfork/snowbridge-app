"use client"

import { trimAccount } from "@/lib/utils";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { zodResolver } from "@hookform/resolvers/zod";
import { TransferSource } from "@snowbridge/api/dist/environment";
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

const onSubmit = (a: any) => {
  alert(JSON.stringify(a))
}

const formSchema = z.object({
  source: z.string().min(1, "Select source."),
  destination: z.string().min(1, "Select destination."),
  token: z.string().min(1, "Select token."),
  amount: z.coerce.number().gt(0, "Must be greater than 0."),
  beneficiary: z.string().regex(/^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{48})$/, "Invalid address format."),
})

export const BeneficiaryInput: FC<{ field: any, destination: TransferSource }> = ({ field, destination }) => {
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom)
  const [beneficiaryFromWallet, setBeneficiaryFromWallet] = useState(true)
  let input = (
    <Input placeholder="0x0000000000000000000000000000000000000000" {...field} />
  )

  const accounts: { key: string, name: string }[] = []
  if (destination?.type === "substrate") {
    polkadotAccounts?.map(x => { return { key: x.address, name: x.name || '' } }).forEach(x => accounts.push(x))
  }

  if (beneficiaryFromWallet && accounts.length > 0) {
    input = (
      <Select onValueChange={field.onChange} value={field.value}>
        <SelectTrigger>
          <SelectValue placeholder="Select a beneficiary" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {accounts.map((acc, i) => (
              <SelectItem key={acc.key + "-" + i} value={acc.key}><div>{acc.name}</div><div>{trimAccount(acc.key, 18)}</div></SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>)
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
  const tokens = Object.keys(snowbridgeEnvironment.erc20tokens)

  const [source, setSource] = useState(snowbridgeEnvironment.sources[0])
  const [destinations, setDestinations] = useState(source.destinationIds.map(d => snowbridgeEnvironment.sources.find(s => d === s.id)!))
  const [destination, setDestination] = useState(destinations[0])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: source.id,
      destination: destination.id,
      token: tokens[0],
    },
  })

  const watchSource = form.watch("source")
  const watchDestination = form.watch("destination")

  useEffect(() => {
    let newDestinations = destinations
    if (source.id !== watchSource) {
      console.log('new Source', source)
      const newSource = snowbridgeEnvironment.sources.find(s => s.id == watchSource)!;
      setSource(newSource)
      newDestinations = newSource.destinationIds.map(d => snowbridgeEnvironment.sources.find(s => d === s.id)).filter(s => s !== undefined).map(s => s!)
      setDestinations(newDestinations)
    }
    setDestination(newDestinations.find(d => d.id == watchDestination) ?? newDestinations[0])

  }, [source, watchSource, watchDestination, setSource, setDestinations, setDestination])

  console.log('AAA', form.getValues())
  console.log('AAA', source, destination)
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
                            {snowbridgeEnvironment.sources.filter(s => s.destinationIds.length > 0).map(s => (
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
                            <SelectValue placeholder="Select a source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {Object.keys(snowbridgeEnvironment.erc20tokens).map(tk => (
                                <SelectItem key={tk} value={tk} >{tk}</SelectItem>
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