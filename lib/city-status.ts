import type { CityStatus } from "@/store/types";

export const CITY_STATUS_LABELS: Record<CityStatus, string> = {
  0: "未知之地",
  1: "斥候侦查",
  2: "战火纷飞",
  3: "金色藩属",
};

/** 卡片背景与边框语义色（深色底上可读）。 */
export function cityStatusCardClass(status: CityStatus): string {
  switch (status) {
    case 0:
      return "border-zinc-600/80 bg-zinc-900/90 text-zinc-200";
    case 1:
      return "border-amber-500/50 bg-amber-950/40 text-amber-100";
    case 2:
      return "border-rose-500/60 bg-rose-950/45 text-rose-50";
    case 3:
      return "border-imperial-gold/70 bg-amber-950/30 text-amber-50";
    default:
      return "border-border bg-card";
  }
}

export function cityStatusDotClass(status: CityStatus): string {
  switch (status) {
    case 0:
      return "bg-zinc-500";
    case 1:
      return "bg-amber-400";
    case 2:
      return "bg-imperial-vermilion";
    case 3:
      return "bg-imperial-gold";
    default:
      return "bg-muted";
  }
}

/** 建设进度条轨道与指示条（随城池态势色）。 */
export function cityStatusProgressTone(status: CityStatus): {
  track: string;
  indicator: string;
} {
  switch (status) {
    case 0:
      return { track: "bg-zinc-800/90", indicator: "bg-zinc-400" };
    case 1:
      return { track: "bg-amber-950/70", indicator: "bg-amber-500" };
    case 2:
      return { track: "bg-rose-950/60", indicator: "bg-imperial-vermilion" };
    case 3:
      return { track: "bg-amber-950/50", indicator: "bg-imperial-gold" };
    default:
      return { track: "bg-primary/20", indicator: "bg-primary" };
  }
}
