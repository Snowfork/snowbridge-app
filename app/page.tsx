import { TransferComponent } from "@/components/transfer/TransferComponent";
import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MainenanceBanner";
import { Suspense } from "react";
import { LucideLoaderCircle } from "lucide-react";

export default function Home() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <Suspense fallback={<Loading />}>
          <TransferComponent />
        </Suspense>
      </ContextComponent>
    </MaintenanceBanner>
  );
}

const Loading = () => {
  return (
    <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
      Fetching Transfer Form{" "}
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
    </div>
  );
};
