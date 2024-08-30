"use client";
export const errorMessage = (err: any) => {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  return "Unknown error";
};
