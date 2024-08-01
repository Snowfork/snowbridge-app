'use client';
import { trimAccount } from '@/lib/utils';
import {
  polkadotAccountsAtom,
  polkadotWalletModalOpenAtom
} from '@/store/polkadot';
import { useAtom, useAtomValue } from 'jotai';
import { FC, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Toggle } from './ui/toggle';



export const SelectAccount: FC<SelectAccountProps> = ({
  field, allowManualInput, accounts,
}) => {
  const [accountFromWallet, setBeneficiaryFromWallet] = useState(true);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [, setPolkadotWalletModalOpen] = useAtom(polkadotWalletModalOpenAtom);
  if (!allowManualInput &&
    accountFromWallet &&
    accounts.length == 0 &&
    (polkadotAccounts == null || polkadotAccounts.length == 0)) {
    return (
      <Button
        className='w-full'
        variant='link'
        onClick={(e) => {
          e.preventDefault();
          setPolkadotWalletModalOpen(true);
        }}
      >
        Connect Polkadot
      </Button>
    );
  }
  let input: JSX.Element;
  if (!allowManualInput && accountFromWallet && accounts.length > 0) {
    input = (
      <Select
        key='controlled'
        onValueChange={field.onChange}
        value={field.value}
      >
        <SelectTrigger>
          <SelectValue placeholder='Select account' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {accounts.map((acc, i) => acc.type === 'substrate' ? (
              <SelectItem key={acc.key + '-' + i} value={acc.key}>
                <div>{acc.name}</div>
                <pre className='md:hidden inline'>
                  {trimAccount(acc.key, 18)}
                </pre>
                <pre className='hidden md:inline'>{acc.key}</pre>
              </SelectItem>
            ) : (
              <SelectItem key={acc.key + '-' + i} value={acc.key}>
                <pre className='md:hidden inline'>
                  {trimAccount(acc.name, 18)}
                </pre>
                <pre className='hidden md:inline'>{acc.name}</pre>
              </SelectItem>
            )
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  } else {
    input = (
      <Input
        key='plain'
        placeholder='0x0000000000000000000000000000000000000000'
        {...field} />
    );
  }

  return (
    <>
      {input}
      <div className={'flex justify-end ' + (allowManualInput ? '' : 'hidden')}>
        <Toggle
          defaultPressed={false}
          pressed={!accountFromWallet}
          onPressedChange={(p) => setBeneficiaryFromWallet(!p)}
          className='text-xs'
        >
          Input account manually.
        </Toggle>
      </div>
    </>
  );
};
