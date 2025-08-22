import { FC } from "react";
import { FormLabel } from "./ui/form";

interface SnowbridgeTRACBalanceDisplayProps {
  sourceAccount?: string;
  className?: string;
}

export const SnowbridgeTRACBalanceDisplay: FC<SnowbridgeTRACBalanceDisplayProps> = ({
  sourceAccount,
  className = "text-sm text-right text-muted-foreground px-1",
}) => {
  // TODO: Implement actual balance fetching logic
  const balance = "1,234.56";
  const symbol = "SnowTRAC";

  //if (!sourceAccount) {
   // return (
   //   <FormLabel className={`${className} hidden`}>
   //     Balance: Fetching...
   //   </FormLabel>
   // );
  //}

  return (
    <FormLabel className={`${className} visible`}>
      Balance: {balance} {symbol}
    </FormLabel>
  );
};
