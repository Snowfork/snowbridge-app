import { FC, PropsWithChildren } from "react";
import { LucideHardHat } from "lucide-react";

export const MaintenanceBanner: FC<PropsWithChildren> = ({ children }) => {
  const maintenance =
    (process.env.NEXT_PUBLIC_SHOW_MAINTENANCE ?? "false")
      .toLowerCase()
      .trim() === "true";
  const message = { __html: process.env.NEXT_PUBLIC_MAINTENANCE_MSG ?? "" };
  if (maintenance) {
    return (
      <>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full md:w-2/3">
          <div className="flex flex-col gap-4 p-5">
            <div className="self-center">
              <LucideHardHat className="flex-none w-48 h-48" />
            </div>
            <p className="text-center text-xl">
              Under Maintenance: Check back soon!
            </p>
            <div
              dangerouslySetInnerHTML={message}
              hidden={
                (process.env.NEXT_PUBLIC_MAINTENANCE_MSG ?? "").trim()
                  .length === 0
              }
              className="text-center"
            ></div>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
};
