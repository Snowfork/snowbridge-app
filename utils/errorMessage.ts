"use client";
export const errorMessage = (err: any) => {
  console.error(err);
  if (err instanceof Error) {
    return err.message;
  }
  return "Unknown error";
};
