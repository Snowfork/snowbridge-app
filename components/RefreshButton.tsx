import { useState } from "react";
import { Button } from "./ui/button";
import { LucideRefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onClick: () => Promise<unknown> | unknown;
  isRefreshing?: boolean;
  disabled?: boolean;
  className?: string;
}
export function RefreshButton({
  onClick,
  isRefreshing,
  disabled,
  className,
}: RefreshButtonProps) {
  const [refresh, setRefresh] = useState(false);

  const isRefreshNow = isRefreshing ?? refresh;
  const isDisabled = isRefreshNow || (disabled ?? false);
  return (
    <Button
      variant="link"
      disabled={isDisabled}
      className={className}
      onClick={async () => {
        setRefresh(true);
        try {
          await onClick();
        } finally {
          setRefresh(false);
        }
      }}
    >
      <div className="flex gap-2 place-items-center">
        <LucideRefreshCw />
        <p>{isRefreshNow ? "Refreshing" : "Refresh"}</p>
      </div>
    </Button>
  );
}
