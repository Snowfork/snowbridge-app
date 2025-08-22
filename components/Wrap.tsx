"use client";
import { FC, useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { WrapFeeDisplay } from "./WrapFeeDisplay";
import { SnowbridgeTRACBalanceDisplay } from "./SnowbridgeTRACBalanceDisplay";
import Image from "next/image";
import { useAtom, useAtomValue } from "jotai";
import { polkadotAccountAtom, polkadotAccountsAtom } from "@/store/polkadot";
import { ConnectPolkadotWalletButton } from "./ConnectPolkadotWalletButton";
import { SelectedPolkadotAccount } from "./SelectedPolkadotAccount";

const wrapFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  sourceAccount: z.string().optional(),
});

type WrapFormData = z.infer<typeof wrapFormSchema>;

export const WrapComponent: FC = () => {
  const [isWrapping, setIsWrapping] = useState(false);
  const [polkadotAccount, setPolkadotAccount] = useAtom(polkadotAccountAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

  const form = useForm<WrapFormData>({
    resolver: zodResolver(wrapFormSchema),
    defaultValues: {
      amount: "",
      sourceAccount: polkadotAccount?.address,
    },
  });

  const onSubmit = useCallback(async (data: WrapFormData) => {
    setIsWrapping(true);
    try {
      console.log("Wrapping:", data);
      // TODO: Implement actual wrapping logic
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
    } catch (error) {
      console.error("Wrap failed:", error);
    } finally {
      setIsWrapping(false);
    }
  }, []);

  const handleMaxClick = () => {
    // TODO: Set max amount based on available balance
    form.setValue("amount", "1234.56");
  };

  return (
    <Card className="w-auto md:w-2/3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image
            src="/images/trac.png"
            alt="TRAC"
            width={32}
            height={32}
          />
          Wrap TRAC
        </CardTitle>
        <CardDescription className="hidden md:flex">
          Convert your SnowTRAC tokens to TRAC tokens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sourceAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <FormControl>
                    <>
                      <SelectedPolkadotAccount
                        source="polkadot"
                        ss58Format={42}
                        polkadotAccounts={polkadotAccounts ?? []}
                        polkadotAccount={polkadotAccount?.address}
                        onValueChange={(account) => {
                          field.onChange(account);
                          const selectedAccount = polkadotAccounts?.find(acc => acc.address === account);
                          if (selectedAccount) {
                            setPolkadotAccount(selectedAccount);
                          }
                        }}
                        placeholder="Connect wallet to select an account"
                      />
                      <div className="flex flex-row-reverse pt-1">
                        <SnowbridgeTRACBalanceDisplay
                          sourceAccount={polkadotAccount?.address}
                        />
                      </div>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="string"
                        placeholder="0.0"
                        className="text-right max-button"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-3"
                        onClick={handleMaxClick}
                      >
                        MAX
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-center text-muted-foreground px-1 mt-1">
              Delivery Fee:{" "}
              <WrapFeeDisplay className="inline" />
            </div>

            {!polkadotAccounts || polkadotAccounts.length === 0 ? (
              <ConnectPolkadotWalletButton variant="default" />
            ) : (
              <Button
                className="w-full my-8 action-button"
                type="submit"
                disabled={isWrapping}
              >
                {isWrapping ? "Wrapping..." : "Wrap"}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
