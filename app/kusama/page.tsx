import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { KusamaComponent } from "@/components/Kusama";
import { FC } from "react";
import { getEnvironmentName } from "@/lib/snowbridgeEnv";
import { bridgeInfoWithKusamaRoutes } from "@/lib/bridgeInfo";

export default function Kusama() {
  const { registry } = bridgeInfoWithKusamaRoutes(getEnvironmentName())!;
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <div className="flex justify-center">
          {registry.kusama ? <KusamaComponent /> : <KusamaUnavailable />}
        </div>
      </ContextComponent>
    </MaintenanceBanner>
  );
}

const KusamaUnavailable: FC = () => {
  return (
    <div className="flex justify-center">Kusama bridge not available.</div>
  );
};
