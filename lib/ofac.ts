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
  if (!request.ok) {
    console.error(request.status, request.statusText, await request.text());
    throw Error(`Failed to execute OFAC check.`);
  }
  const result = await request.json();
  if (!("identifications" in result)) {
    console.error(request.status, request.statusText, result);
    throw Error(`Failed to execute OFAC check.`);
  }
  if (result.identifications.length !== 0) {
    return true;
  }
  return false;
};
