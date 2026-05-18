"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { BatchCampaignOps } from "@/components/dashboard/batch-campaign-ops";
import { CampaignClusterIcon } from "@/components/icons/campaign-cluster-icon";
import { MobileSubpageShell } from "@/components/layout/mobile-subpage-shell";
import { normalizeCampaignPhase } from "@/lib/campaign-phase";
import type { CampaignPhase } from "@/store/types";

function parseCityIdsParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function CampaignOpsPageContent() {
  const searchParams = useSearchParams();
  const defaultPhase = useMemo((): CampaignPhase | undefined => {
    return normalizeCampaignPhase(searchParams.get("phase") ?? undefined);
  }, [searchParams]);
  const defaultCityIds = useMemo(
    () => parseCityIdsParam(searchParams.get("cities")),
    [searchParams]
  );

  return (
    <BatchCampaignOps
      defaultPhase={defaultPhase}
      defaultCityIds={defaultCityIds}
    />
  );
}

export function CampaignOpsPageChrome() {
  return (
    <MobileSubpageShell
      title="集团军 · 战役集群"
      subtitle="多城流水线 · 集群点卯"
      icon={
        <CampaignClusterIcon
          className="text-imperial-gold"
          title="集团军 · 战役集群"
        />
      }
      maxWidthClass="max-w-4xl"
      headerClassName="border-imperial-gold/25"
    >
      <Suspense
        fallback={
          <p className="py-12 text-center text-sm text-muted-foreground">
            整军待发…
          </p>
        }
      >
        <CampaignOpsPageContent />
      </Suspense>
    </MobileSubpageShell>
  );
}
