import type { Quest } from "@/store/types";

/** 与 MVA 四大部对应的建设维度（谍战布防并入招兵买马 / 流量）。 */
export type ImperialAxis =
  | "territory"
  | "traffic"
  | "diplomacy"
  | "delivery";

const AXIS_LABEL: Record<ImperialAxis, string> = {
  territory: "疆域勘探",
  traffic: "招兵买马",
  diplomacy: "外交风云",
  delivery: "宣教抚民",
};

export function imperialAxisLabel(axis: ImperialAxis): string {
  return AXIS_LABEL[axis];
}

export const IMPERIAL_AXES_ORDER: ImperialAxis[] = [
  "territory",
  "traffic",
  "diplomacy",
  "delivery",
];

/** 内置 MVA 任务 id → 维度（用户自建任务走标题启发式）。 */
const QUEST_AXIS_BY_ID: Record<string, ImperialAxis> = {
  "quest-mva-早朝-1": "territory",
  "quest-mva-早朝-2": "traffic",
  "quest-mva-早朝-3": "traffic",
  "quest-mva-早朝-4": "traffic",
  "quest-mva-晌午-1": "traffic",
  "quest-mva-晌午-2": "territory",
  "quest-mva-晌午-3": "traffic",
  "quest-mva-傍晚-1": "diplomacy",
  "quest-mva-傍晚-2": "diplomacy",
  "quest-mva-傍晚-3": "diplomacy",
  "quest-mva-傍晚-4": "diplomacy",
  "quest-mva-深夜-1": "traffic",
  "quest-mva-深夜-2": "delivery",
  "quest-mva-深夜-3": "diplomacy",
};

function inferAxisFromTitle(title: string): ImperialAxis {
  const t = title;
  if (/云点播|课程|考试|试卷|合同|修习|交付|皇城基建/i.test(t)) {
    return "delivery";
  }
  if (/外交|内务|藩属|通牒|同盟|死粉|太医院|复盘|停机/i.test(t)) {
    return "diplomacy";
  }
  if (/礼部.*间谍|侦查.*同行|底价|户部.*国库/i.test(t)) {
    return "territory";
  }
  if (/刑部|拓词|军团|创意|样式|落地|对话|计划|单元|OCPC|搜索词|点火|出征/i.test(t)) {
    return "traffic";
  }
  if (/兵部|工部|户部|礼部|刑部/i.test(t)) {
    return "traffic";
  }
  return "traffic";
}

export function getQuestImperialAxis(quest: Pick<Quest, "id" | "title">): ImperialAxis {
  const byId = QUEST_AXIS_BY_ID[quest.id];
  if (byId) return byId;
  return inferAxisFromTitle(quest.title);
}

export function questsForImperialAxis(
  quests: Quest[],
  axis: ImperialAxis
): Quest[] {
  return quests.filter((q) => getQuestImperialAxis(q) === axis);
}

export type AxisProgressSlice = {
  axis: ImperialAxis;
  label: string;
  done: number;
  total: number;
  pct: number;
};

export function computeImperialAxisProgress(
  quests: Quest[],
  isFullyCompletedToday: (q: Quest) => boolean
): AxisProgressSlice[] {
  return IMPERIAL_AXES_ORDER.map((axis) => {
    const axisQuests = questsForImperialAxis(quests, axis);
    const total = axisQuests.length;
    const done = axisQuests.filter((q) => isFullyCompletedToday(q)).length;
    const pct =
      total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
    return {
      axis,
      label: imperialAxisLabel(axis),
      done,
      total,
      pct,
    };
  });
}
