import { atomWithStorage } from "jotai/utils";

export const acceptedTermsOfUseAtom = atomWithStorage<boolean>(
  "accepted_terms_of_use",
  false,
);
