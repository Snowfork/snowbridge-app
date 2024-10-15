import { FC, PropsWithChildren } from "react";
import { LucideHardHat } from "lucide-react";

export const MaintenanceBanner: FC<PropsWithChildren> = ({ children }) => {
  const maintenance =
    (process.env.NEXT_PUBLIC_SHOW_MAINTENANCE ?? "false")
      .toLowerCase()
      .trim() === "true";

  if (maintenance) {
    return (
      <div className="flex-col gap-2">
        <div className="flex justify-center">
          <LucideHardHat />
        </div>
        <p>Under Maintenance: Check back soon!</p>
      </div>
    );
  }

  return <>{children}</>;
};
