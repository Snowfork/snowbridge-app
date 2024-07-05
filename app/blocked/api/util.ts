import axios from "axios";

export const checkOFAC = async (address: string): Promise<boolean> => {
  let result = await axios.get(
    `https://public.chainalysis.com/api/v1/address/${address}`,
    {
      headers: {
        "X-API-Key":
          "4238c27d0f6e634bf531e9c9f458ab44dc462c536e1bc1cf4565a4bc1c1d554e",
        "Content-Type": "application/json",
      },
    }
  );
  if (result.data?.identifications?.length) {
    return false;
  }
  return true;
};
