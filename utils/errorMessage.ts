"use client";
export const errorMessage = (err: any) => {
  if (err instanceof Error) {
    const message = err.message;

    if (message.toLowerCase().startsWith("insufficient funds")) {
      return "Insufficient funds to complete this transaction.";
    }
    if (message.toLowerCase().startsWith("user rejected action")) {
      return "Transaction cancelled.";
    }

    return message;
  }
  return "Unknown error";
};
