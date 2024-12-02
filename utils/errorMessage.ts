"use client";
export const errorMessage = (err: any) => {
  if (err instanceof Error) {
    return err.message;
  }
  return "Unknown error";
};
