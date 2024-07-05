export const checkOFAC = async (
  address: string,
  apiKey: string,
): Promise<boolean> => {
  const request = await fetch(
    `https://public.chainalysis.com/api/v1/address/${address}`,
    {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    },
  );
  const result = await request.json();
  if (result.data?.identifications?.length) {
    return true;
  }
  return false;
};
