export type Network = { Ethereum: { chain_id: number } };
export type Junction =
  | { Parachain: number }
  | { AccountKey20: { key: `0x${string}` } }
  | { AccountId32: { id: `0x${string}` } }
  | { GlobalConsensus: Network };
export type Location = {
  parents: 0 | 1 | 2;
  interior:
    | "Here"
    | { X1: [Junction] }
    | { X2: [Junction, Junction] }
    | { X3: [Junction, Junction, Junction] }
    | { X4: [Junction, Junction, Junction, Junction] }
    | { X5: [Junction, Junction, Junction, Junction, Junction] }
    | { X6: [Junction, Junction, Junction, Junction, Junction, Junction] };
};
