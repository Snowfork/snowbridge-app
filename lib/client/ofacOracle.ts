// Client-side OFAC screening via the Chainalysis on-chain sanctions oracle.
// Replaces the former server route that called Chainalysis's keyed REST API
// (no CORS, secret key) so the app can run as a static bundle on IPFS.
//
// The oracle is permissionless (no API key) and deployed at the same address
// across EVM chains. We always query Ethereum mainnet, where it exists and
// where OFAC's sanctioned-address data lives. Coverage is EVM-only: the OFAC
// SDN crypto list contains no Polkadot SS58 addresses, so non-EVM addresses
// are treated as not sanctioned.
import { ethers } from "ethers";

const ORACLE_ADDRESS = "0x40C57923924B5c5c5455c48D93317139ADDaC8fb";
const ORACLE_ABI = ["function isSanctioned(address) view returns (bool)"];

let oracle: ethers.Contract | null = null;

function getOracle(): ethers.Contract {
  if (oracle) return oracle;

  const key = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
  const provider = key
    ? new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${key}`)
    : ethers.getDefaultProvider(1);

  oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
  return oracle;
}

// Returns true if the address is on the sanctions list. Non-EVM addresses
// (e.g. Substrate SS58) can't be screened by the oracle and resolve to false.
export async function isAddressSanctioned(address: string): Promise<boolean> {
  if (!ethers.isAddress(address)) {
    return false;
  }
  return getOracle().isSanctioned(address);
}
