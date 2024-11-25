import { useState } from "react";
import { Button } from "./ui/button";
import { LucideRefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onClick: () => Promise<unknown> | unknown;
  isRefreshing?: boolean;
}
export function RefreshButton({ onClick, isRefreshing }: RefreshButtonProps) {
  const [refresh, setRefresh] = useState(false);

  const isRefreshNow = isRefreshing ?? refresh;
  return (
    <Button
      variant="link"
      size="sm"
      disabled={isRefreshNow}
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
