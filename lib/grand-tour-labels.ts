import type { TourRegion } from "@/store/types";

export function formatTourRegionLabel(
  r: Pick<TourRegion, "ancientName" | "modernName">
): string {
  const a = r.ancientName.trim();
  const m = r.modernName.trim();
  if (a && m) return `${a} · ${m}`;
  return a || m || "未命名京畿";
}

export const TOUR_ITEM_KIND_LABEL: Record<
  import("@/store/types").TourItemKind,
  string
> = {
  sight: "游览",
  meal: "膳宿",
  lodge: "驻跸",
  transport: "驿传",
  ticket: "门券",
};

export const GRAND_TOUR_STATUS_LABEL: Record<
  import("@/store/types").GrandTourStatus,
  string
> = {
  draft: "草稿",
  active: "进行中",
  archived: "归档",
};
