"use client"

import { FC, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAtomValue } from "jotai"
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { TransferSource } from "@snowbridge/api/dist/environment";

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

type TransferProps = {}

export const TransferForm: FC<TransferProps> = ({ }) => {

  const snowbridgeEnvironment = useAtomValue(snowbridgeEnvironmentAtom);
  const [source, setSource] = useState(snowbridgeEnvironment.sources[0].id)
  const [destinations, setDestinations] = useState<TransferSource[]>([])
  const tokens = Object.keys(snowbridgeEnvironment.erc20tokens)

  useEffect(() => {
    const newSource = snowbridgeEnvironment.sources.find(s => s.id == form.getValues().source)!
    const newDestinations = snowbridgeEnvironment.sources.filter(s => newSource.destinationIds.find(d => d == s.id) !== undefined)
    setDestinations(newDestinations)
      if(newDestinations.find(d => d.id == form.getValues().destination) === undefined) {
        form.setValue("destination", "")
      }
  }, [source, setDestinations])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: snowbridgeEnvironment.sources[0].id,
      destination: snowbridgeEnvironment.sources[0].destinationIds[0],
      token: tokens[0],
    },
  })

  const watchSource = form.watch("source")
  useEffect(()=> setSource(watchSource), [watchSource])

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
                                <SelectItem value={tk} >{tk}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
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
                  <FormDescription>SS58 or Hex address</FormDescription>
                  <FormControl>
                    <Input placeholder="0x0000000000000000000000000000000000000000" {...field} />
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