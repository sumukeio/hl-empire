"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { ArrowLeft } from "lucide-react";

import { BatchCampaignOps } from "@/components/dashboard/batch-campaign-ops";
import { CampaignClusterIcon } from "@/components/icons/campaign-cluster-icon";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-imperial-gold/25 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-imperial-gold hover:bg-imperial-gold/10"
            asChild
          >
            <Link href="/dashboard" aria-label="返回九州图志">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <CampaignClusterIcon
            className="text-imperial-gold"
            title="集团军 · 战役集群"
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-imperial-gold">
              集团军 · 战役集群
            </h1>
            <p className="text-[11px] text-muted-foreground">
              多城流水线 · 集群点卯
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Suspense
          fallback={
            <p className="py-12 text-center text-sm text-muted-foreground">
              整军待发…
            </p>
          }
        >
          <CampaignOpsPageContent />
        </Suspense>
      </main>
    </div>
  );
}
