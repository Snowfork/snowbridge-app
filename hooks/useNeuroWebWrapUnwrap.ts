export function useNeuroWebWrapUnwrap() {
  const unwrap = async function (beneficiary: string, amount: bigint) {
    console.log("abcdec", beneficiary, amount);
    return {
      blockNumber: 0,
      txIndex: 0,
      error: undefined as any,
    };
  };
  return {
    unwrap,
  };
}
