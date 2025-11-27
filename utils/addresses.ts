import { isHex, u8aToHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

export function walletTxChecker(
  walletAccounts: string[] | null,
): (sourceAddress: string, beneficiaryAddress: string) => boolean {
  const accounts = new Set();
  (walletAccounts ?? []).forEach((acc) => {
    const address = acc.trim();
    if (isHex(address, 160)) {
      // 20 byte hex
      // Add raw account
      accounts.add(address.toLowerCase());
      // Add account extended to 32byte address with zero pad. (Subsquid format for 20 byte address)
      accounts.add(address.toLowerCase() + "000000000000000000000000");
    } else if (isHex(address, 256)) {
      // 32 byte hex
      // Add raw account
      accounts.add(address.toLowerCase());
    } else {
      // SS58 address
      try {
        accounts.add(u8aToHex(decodeAddress(address)).toLowerCase());
      } catch (err) {
        console.warn(`could not convert address ${address} to hex.`, err);
      }
    }
  });
  return (sourceAddress: string, beneficiaryAddress: string) =>
    accounts.has(sourceAddress?.trim().toLowerCase()) ||
    accounts.has(beneficiaryAddress?.trim().toLowerCase());
}
