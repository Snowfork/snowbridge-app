"use client"

import { FC } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export const TransferForm: FC = () => {
  let form = useForm()
  const onSubmit = (a: any) => {
    alert(JSON.stringify(a))
  }
  return (
    <Card className="w-auto">
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
                      <Select onValueChange={field.onChange} defaultValue="ethereum">
                        <SelectTrigger>
                          <SelectValue placeholder="Select a source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="ethereum">Ethereum</SelectItem>
                            <SelectItem value="assethub">AssetHub</SelectItem>
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
                      <Select onValueChange={field.onChange} defaultValue="assethub">
                        <SelectTrigger >
                          <SelectValue placeholder="Select a destination" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="ethereum">Ethereum</SelectItem>
                            <SelectItem value="assethub">AssetHub</SelectItem>
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="invisible">Token</FormLabel>
                      <FormControl>
                        <Select defaultValue="weth">
                          <SelectTrigger>
                            <SelectValue placeholder="Select a source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="weth" >WETH</SelectItem>
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