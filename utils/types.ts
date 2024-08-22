import { type useRouter } from "next/navigation";
import { toPolkadot, toEthereum, environment } from "@snowbridge/api";

export type AppRouter = ReturnType<typeof useRouter>;
export type ValidationError =
  | ({ kind: "toPolkadot" } & toPolkadot.SendValidationError)
  | ({ kind: "toEthereum" } & toEthereum.SendValidationError);

export type ErrorInfo = {
  title: string;
  description: string;
  errors: ValidationError[];
};

export type FormDataSwitch = {
  source: environment.TransferLocation;
  sourceAccount: string;
  destination: environment.TransferLocation;
  token: string;
  amount: string;
  beneficiary: string;
};

export type FormData = {
  source: string;
  sourceAccount: string;
  destination: string;
  token: string;
  amount: string;
  beneficiary: string;
};
export type AccountInfo = {
  key: string;
  name: string;
  type: "substrate" | "ethereum";
};
