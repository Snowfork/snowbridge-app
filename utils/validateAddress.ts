import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { hexToU8a, isHex } from "@polkadot/util";

export function validateAddress(address: string): boolean {
  try {
    encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));
    return true;
  } catch (error) {
    return false;
  }
}
