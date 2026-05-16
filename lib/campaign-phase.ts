import type { CampaignPhase, Quest } from "@/store/types";

export const CAMPAIGN_PHASES: readonly CampaignPhase[] = [
  "PRE_LAUNCH",
  "POST_LAUNCH",
  "ON_LEAD",
  "ON_ORDER",
] as const;

export const CAMPAIGN_PHASE_LABEL: Record<CampaignPhase, string> = {
  PRE_LAUNCH: "战役筹谋：厉兵秣马",
  POST_LAUNCH: "合围据守：每日军务",
  ON_LEAD: "短兵相接：接引投诚",
  ON_ORDER: "捷报破城：勒石燕然",
};

export function campaignPhaseLabel(phase: CampaignPhase): string {
  return CAMPAIGN_PHASE_LABEL[phase];
}

/** 内置 MVA 任务 · 战役阶段（用户可在枢密院覆盖） */
const MVA_CAMPAIGN_PHASE_BY_ID: Record<string, CampaignPhase> = {
  "quest-mva-早朝-1": "POST_LAUNCH",
  "quest-mva-早朝-2": "POST_LAUNCH",
  "quest-mva-早朝-3": "POST_LAUNCH",
  "quest-mva-早朝-4": "PRE_LAUNCH",
  "quest-mva-早朝-6": "PRE_LAUNCH",
  "quest-mva-晌午-2": "PRE_LAUNCH",
  "quest-mva-晌午-3": "PRE_LAUNCH",
  "quest-mva-晌午-4": "PRE_LAUNCH",
  "quest-mva-晌午-5": "PRE_LAUNCH",
  "quest-mva-傍晚-1": "PRE_LAUNCH",
  "quest-mva-傍晚-2": "PRE_LAUNCH",
  "quest-mva-傍晚-3": "PRE_LAUNCH",
  "quest-mva-傍晚-4": "PRE_LAUNCH",
  "quest-mva-晌午-6": "POST_LAUNCH",
  "quest-mva-晌午-7": "ON_LEAD",
  "quest-mva-晌午-8": "ON_LEAD",
  "quest-mva-早朝-7": "ON_LEAD",
  "quest-mva-早朝-8": "ON_LEAD",
  "quest-mva-深夜-3": "ON_LEAD",
  "quest-mva-深夜-4": "ON_LEAD",
  "quest-mva-傍晚-6": "ON_ORDER",
  "quest-mva-傍晚-7": "ON_ORDER",
  "quest-mva-傍晚-8": "ON_ORDER",
};

function inferCampaignPhaseFromTitle(title: string): CampaignPhase {
  const t = title;
  if (/开通.*系统|册封士子|开通修习|创建课程.*开通|开科取士/.test(t)) {
    return "ON_ORDER";
  }
  if (/合同|盟约|缔结/.test(t)) return "ON_ORDER";
  if (/复盘|截图|问诊|Gemini|死单|定策外交|宣威/.test(t)) {
    return "ON_LEAD";
  }
  if (/下载|上传|云点播|转运粮草|征收粮草|搜集朋友圈|仿制军械/.test(t)) {
    return "ON_LEAD";
  }
  if (/查阅国库|查杀贪官|招募壮丁|核算国库/.test(t)) {
    return "POST_LAUNCH";
  }
  if (
    /刺探|商贸往来|暗号对接|构筑防线|扩军招募|组建军团|军团整编|发布讨伐|神机营造|监造军械|新兵入营/.test(
      t
    )
  ) {
    return "PRE_LAUNCH";
  }
  return "POST_LAUNCH";
}

export function normalizeCampaignPhase(raw: unknown): CampaignPhase | undefined {
  if (
    raw === "PRE_LAUNCH" ||
    raw === "POST_LAUNCH" ||
    raw === "ON_LEAD" ||
    raw === "ON_ORDER"
  ) {
    return raw;
  }
  return undefined;
}

export function getQuestCampaignPhase(
  quest: Pick<Quest, "id" | "title" | "campaignPhase">
): CampaignPhase {
  const explicit = normalizeCampaignPhase(quest.campaignPhase);
  if (explicit) return explicit;
  const byId = MVA_CAMPAIGN_PHASE_BY_ID[quest.id];
  if (byId) return byId;
  return inferCampaignPhaseFromTitle(quest.title);
}

export function filterQuestsByCampaignPhase(
  quests: readonly Quest[],
  phase: CampaignPhase
): Quest[] {
  return quests.filter((q) => getQuestCampaignPhase(q) === phase);
}

/** 破城后「开通学习系统」类政务，触发转运粮草连锁邸报 */
export function isOpenLearningSystemQuest(title: string): boolean {
  return /开通.*系统|册封士子|开通修习|创建课程.*开通/.test(title.trim());
}
