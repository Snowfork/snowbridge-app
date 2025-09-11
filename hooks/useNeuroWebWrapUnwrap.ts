export function useNeuroWebWrapUnwrap() {
  const unwrap = async function (beneficiary: string, amount: bigint) {
    console.log("abcdec", beneficiary, amount);
    return {
      blockNumber: 0,
      txIndex: 0,
      error: undefined as any,
    };
  };
  const wrap = async function (beneficiary: string, amount: bigint) {
    console.log("abcdec", beneficiary, amount);
    return {
      blockNumber: 0,
      txIndex: 0,
      error: undefined as any,
    };
  };
  const balance = { data: 10000000000000n };
  return {
    unwrap,
    wrap,
    balance,
  };
}
