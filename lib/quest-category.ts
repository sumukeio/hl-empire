import type { Quest, QuestCategory } from "@/store/types";

export const QUEST_CATEGORIES: readonly QuestCategory[] = [
  "product",
  "traffic",
  "conversion",
  "delivery",
] as const;

export type QuestCategoryFilter = "all" | QuestCategory;

export const QUEST_CATEGORY_FILTER_OPTIONS: readonly {
  id: QuestCategoryFilter;
  label: string;
}[] = [
  { id: "all", label: "全部" },
  { id: "product", label: "产品" },
  { id: "traffic", label: "流量" },
  { id: "conversion", label: "转化" },
  { id: "delivery", label: "交付" },
] as const;

const CATEGORY_META: Record<
  QuestCategory,
  { label: string; dotClass: string; badgeClass: string }
> = {
  product: {
    label: "产品",
    dotClass: "bg-blue-400",
    badgeClass:
      "border-blue-400/50 bg-blue-950/50 text-blue-300 hover:bg-blue-950/70",
  },
  traffic: {
    label: "流量",
    dotClass: "bg-orange-400",
    badgeClass:
      "border-orange-400/50 bg-orange-950/50 text-orange-300 hover:bg-orange-950/70",
  },
  conversion: {
    label: "转化",
    dotClass: "bg-imperial-gold",
    badgeClass:
      "border-imperial-gold/50 bg-imperial-gold/10 text-imperial-gold hover:bg-imperial-gold/15",
  },
  delivery: {
    label: "交付",
    dotClass: "bg-emerald-400",
    badgeClass:
      "border-emerald-400/50 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-950/70",
  },
};

/** 祖宗之法 31 项 · 业务维度（与 `docs/MVA.md` / `docs/政务清单.md` 对齐） */
const MVA_QUEST_CATEGORY_BY_ID: Record<string, QuestCategory> = {
  "quest-mva-早朝-1": "traffic",
  "quest-mva-早朝-2": "traffic",
  "quest-mva-早朝-3": "traffic",
  "quest-mva-早朝-4": "traffic",
  "quest-mva-早朝-5": "product",
  "quest-mva-早朝-6": "traffic",
  "quest-mva-早朝-7": "product",
  "quest-mva-早朝-8": "product",
  "quest-mva-早朝-9": "product",
  "quest-mva-晌午-1": "traffic",
  "quest-mva-晌午-2": "product",
  "quest-mva-晌午-3": "product",
  "quest-mva-晌午-4": "traffic",
  "quest-mva-晌午-5": "traffic",
  "quest-mva-晌午-6": "conversion",
  "quest-mva-晌午-7": "traffic",
  "quest-mva-晌午-8": "traffic",
  "quest-mva-傍晚-1": "conversion",
  "quest-mva-傍晚-2": "conversion",
  "quest-mva-傍晚-3": "traffic",
  "quest-mva-傍晚-4": "traffic",
  "quest-mva-傍晚-5": "traffic",
  "quest-mva-傍晚-6": "delivery",
  "quest-mva-傍晚-7": "delivery",
  "quest-mva-傍晚-8": "conversion",
  "quest-mva-深夜-1": "conversion",
  "quest-mva-深夜-2": "conversion",
  "quest-mva-深夜-3": "conversion",
  "quest-mva-深夜-4": "conversion",
  "quest-mva-深夜-5": "product",
  "quest-mva-深夜-6": "traffic",
};

export function normalizeQuestCategory(raw: unknown): QuestCategory {
  if (
    raw === "product" ||
    raw === "traffic" ||
    raw === "conversion" ||
    raw === "delivery"
  ) {
    return raw;
  }
  return "traffic";
}

export function questCategoryLabel(category: QuestCategory): string {
  return CATEGORY_META[category].label;
}

export function questCategoryDotClass(category: QuestCategory): string {
  return CATEGORY_META[category].dotClass;
}

export function questCategoryBadgeClass(category: QuestCategory): string {
  return CATEGORY_META[category].badgeClass;
}

function inferCategoryFromTitle(title: string): QuestCategory {
  const t = title;
  if (
    /云点播|课程|考试|试卷|修习|册封|开科|炼制内丹|征收粮草|转运粮草|商贸往来|供应商|渠道权限|竞价尽调|刺探虚实/i.test(
      t
    )
  ) {
    if (/册封|开科|考试|试卷|修习权限/i.test(t)) return "delivery";
    if (/云点播|课程|粮草|转码|供应商|尽调|刺探/i.test(t)) return "product";
  }
  if (/落地|巧舱|对话|合同|盟约|逼单|话术|复盘|问诊|停机|朋友圈|宣威|定策外交|核算国库|发货/i.test(t)) {
    return "conversion";
  }
  if (/搜索词|拓词|军团|创意|样式|OCPC|讨伐|关键词|否词|小红书|截流|仿制|掠夺物资|查阅国库|组建军团/i.test(t)) {
    return "traffic";
  }
  return "traffic";
}

export function getQuestCategory(
  quest: Pick<Quest, "id" | "title"> & { category?: QuestCategory }
): QuestCategory {
  if (quest.category != null) {
    return normalizeQuestCategory(quest.category);
  }
  const byId = MVA_QUEST_CATEGORY_BY_ID[quest.id];
  if (byId) return byId;
  return inferCategoryFromTitle(quest.title);
}

export function filterQuestsByCategory<T extends Pick<Quest, "id" | "title" | "category">>(
  quests: T[],
  filter: QuestCategoryFilter
): T[] {
  if (filter === "all") return quests;
  return quests.filter((q) => getQuestCategory(q) === filter);
}
