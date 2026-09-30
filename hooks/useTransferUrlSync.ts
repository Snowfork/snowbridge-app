import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface TransferUrlValues {
  source: string;
  destination: string;
  token: string;
  amount: string;
}

export function useTransferUrlSync({
  source,
  destination,
  token,
  amount,
}: TransferUrlValues) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("source", source);
    nextSearchParams.set("destination", destination);
    nextSearchParams.set("token", token);
    nextSearchParams.set("amount", amount);

    const nextSearch = nextSearchParams.toString();
    if (nextSearch !== currentSearch) {
      router.replace(`${pathname}?${nextSearch}`);
    }
  }, [
    amount,
    currentSearch,
    destination,
    pathname,
    router,
    searchParams,
    source,
    token,
  ]);
}
