import { FC } from "react";

interface WrapFeeDisplayProps {
  className?: string;
}

export const WrapFeeDisplay: FC<WrapFeeDisplayProps> = ({ className }) => {
  // TODO: Implement actual fee calculation logic
  const feeAmount = "0.001";
  const feeSymbol = "NEURO";

  return (
    <div className={className}>
      {feeAmount} {feeSymbol}
    </div>
  );
};
