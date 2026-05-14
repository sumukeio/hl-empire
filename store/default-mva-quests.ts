import type {
  Quest,
  QuestCompensationType,
  QuestOccurrence,
  QuestPeriod,
} from "./types";

export type MvaQuestSeed = {
  period: QuestPeriod;
  slot: string;
  title: string;
  expReward: number;
  staminaCost: number;
  minCompletionTime: number;
  compensationType: QuestCompensationType;
  occurrence: QuestOccurrence;
};

export function maxFromOccurrence(o: QuestOccurrence): number {
  return o === "daily_multiple" ? 99 : 1;
}

/**
 * 枢密院祖宗之法 · 政务清单 31 项（见 `docs/政务清单.md`）。
 * id：`quest-mva-{period}-{slot}`，与旧十四务 slot 重叠处 id 不变以便迁移勘合键。
 */
export const MVA_QUEST_SEEDS: readonly MvaQuestSeed[] = [
  {
    period: "早朝",
    slot: "1",
    title: "【户部】查阅国库：查验昨日竞价消耗与转化",
    expReward: 10,
    staminaCost: 5,
    minCompletionTime: 2,
    compensationType: "compensable",
    occurrence: "daily_once",
  },
  {
    period: "早朝",
    slot: "2",
    title: "【刑部】查杀贪官：下载搜索词报告，精确否定垃圾词",
    expReward: 20,
    staminaCost: 10,
    minCompletionTime: 2,
    compensationType: "absolute",
    occurrence: "daily_once",
  },
  {
    period: "早朝",
    slot: "3",
    title: "【兵部】招募壮丁：根据出单词与搜索词进行系统拓词",
    expReward: 15,
    staminaCost: 10,
    minCompletionTime: 3,
    compensationType: "compensable",
    occurrence: "daily_once",
  },
  {
    period: "早朝",
    slot: "4",
    title: "【兵部】扩军招募：通过关键词规划师拓展词汇，吸纳新鲜兵源",
    expReward: 18,
    staminaCost: 10,
    minCompletionTime: 10,
    compensationType: "absolute",
    occurrence: "daily_once",
  },
  {
    period: "早朝",
    slot: "5",
    title: "【工部】皇城基建：上传云点播课程",
    expReward: 22,
    staminaCost: 15,
    minCompletionTime: 10,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "早朝",
    slot: "6",
    title:
      "【工部】组建军团：创建计划单元、导关键词，配置出价，将新兵编入军团",
    expReward: 15,
    staminaCost: 10,
    minCompletionTime: 3,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "早朝",
    slot: "7",
    title: "【工部】征收粮草：搜索学习视频",
    expReward: 20,
    staminaCost: 12,
    minCompletionTime: 15,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "早朝",
    slot: "8",
    title: "【工部】转运粮草：下载学习视频",
    expReward: 18,
    staminaCost: 10,
    minCompletionTime: 10,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "早朝",
    slot: "9",
    title: "【工部】转运粮草：上传学习视频至云仓库",
    expReward: 20,
    staminaCost: 12,
    minCompletionTime: 15,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "晌午",
    slot: "1",
    title: "【兵部】新兵入营：对关键词粗分、人工筛选、精否短否",
    expReward: 45,
    staminaCost: 20,
    minCompletionTime: 120,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "晌午",
    slot: "2",
    title: "【礼部】商贸往来：联络供应商，获取产品报价与渠道权限",
    expReward: 22,
    staminaCost: 12,
    minCompletionTime: 10,
    compensationType: "absolute",
    occurrence: "daily_multiple",
  },
  {
    period: "晌午",
    slot: "3",
    title: "【兵部】刺探虚实：竞价尽调，盘点当前城池敌军（同行）数量",
    expReward: 18,
    staminaCost: 10,
    minCompletionTime: 20,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "晌午",
    slot: "4",
    title: "【工部】神机营造：制作高级样式文案与图片，升级军队重型装备",
    expReward: 24,
    staminaCost: 15,
    minCompletionTime: 20,
    compensationType: "absolute",
    occurrence: "daily_multiple",
  },
  {
    period: "晌午",
    slot: "5",
    title: "【工部】监造军械：利用 AI 打造高点击率创意文案与图片装备",
    expReward: 24,
    staminaCost: 15,
    minCompletionTime: 20,
    compensationType: "absolute",
    occurrence: "daily_multiple",
  },
  {
    period: "晌午",
    slot: "6",
    title: "【户部】核算国库：更新发货、竞价汇总及每周数据统计表",
    expReward: 20,
    staminaCost: 10,
    minCompletionTime: 10,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "晌午",
    slot: "7",
    title: "【兵部】掠夺物资：搜集朋友圈素材，充实帝国军备库",
    expReward: 12,
    staminaCost: 8,
    minCompletionTime: 5,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "晌午",
    slot: "8",
    title: "【工部】仿制军械：对素材复刻改写，打造己方宣传兵器",
    expReward: 10,
    staminaCost: 5,
    minCompletionTime: 2,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "傍晚",
    slot: "1",
    title: "【工部】构筑防线：制作巧舱落地单页，建立帝国转化堡垒",
    expReward: 22,
    staminaCost: 12,
    minCompletionTime: 10,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "傍晚",
    slot: "2",
    title: "【工部】暗号对接：配置巧舱对话逻辑，设置自动应答军令",
    expReward: 22,
    staminaCost: 12,
    minCompletionTime: 15,
    compensationType: "absolute",
    occurrence: "daily_once",
  },
  {
    period: "傍晚",
    slot: "3",
    title: "【兵部】军团整编：在后台创建计划与单元，完成部队最终编组",
    expReward: 16,
    staminaCost: 10,
    minCompletionTime: 5,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "傍晚",
    slot: "4",
    title: "【兵部】发布讨伐令：启动 OCPC 投放，正式发起城池攻坚战",
    expReward: 25,
    staminaCost: 12,
    minCompletionTime: 2,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "傍晚",
    slot: "5",
    title: "【兵部】敌后奇袭：实施小红书截流，奇袭敌方潜在客户",
    expReward: 12,
    staminaCost: 8,
    minCompletionTime: 5,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "傍晚",
    slot: "6",
    title: "【礼部】册封士子：在系统中创建课程并为学员开通修习权限",
    expReward: 24,
    staminaCost: 14,
    minCompletionTime: 15,
    compensationType: "absolute",
    occurrence: "daily_multiple",
  },
  {
    period: "傍晚",
    slot: "7",
    title: "【礼部】开科取士：制作考试试卷并开通系统，检验修习成果",
    expReward: 20,
    staminaCost: 12,
    minCompletionTime: 10,
    compensationType: "absolute",
    occurrence: "daily_multiple",
  },
  {
    period: "傍晚",
    slot: "8",
    title: "【礼部】缔结盟约：与客户签订正式电子合同，确立契约关系",
    expReward: 15,
    staminaCost: 8,
    minCompletionTime: 5,
    compensationType: "absolute",
    occurrence: "daily_multiple",
  },
  {
    period: "深夜",
    slot: "1",
    title: "【礼部】宣威天下：分时段发布朋友圈，展示帝国武功",
    expReward: 10,
    staminaCost: 5,
    minCompletionTime: 2,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "深夜",
    slot: "2",
    title:
      "【礼部】定策外交：针对不同层级客户（K/L/Z/ZB/B）制定逼单话术",
    expReward: 22,
    staminaCost: 12,
    minCompletionTime: 15,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "深夜",
    slot: "3",
    title: "【太医院】金疮问诊：复盘聊天记录，诊断策略漏洞并打补丁",
    expReward: 24,
    staminaCost: 12,
    minCompletionTime: 20,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "深夜",
    slot: "4",
    title: "【太医院】停机复盘：提取死单截图，生成复盘奏折呈交 AI 导师",
    expReward: 25,
    staminaCost: 10,
    minCompletionTime: 4,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
  {
    period: "深夜",
    slot: "5",
    title: "【工部】炼制内丹：对视频转码处理，确保学习路径畅通无阻",
    expReward: 26,
    staminaCost: 14,
    minCompletionTime: 20,
    compensationType: "absolute",
    occurrence: "one_time",
  },
  {
    period: "深夜",
    slot: "6",
    title: "【礼部】宣威天下：分时段发布小红书，展示帝国武功",
    expReward: 10,
    staminaCost: 5,
    minCompletionTime: 2,
    compensationType: "compensable",
    occurrence: "daily_multiple",
  },
] as const;

export function buildDefaultMvaQuestsFromSeeds(): Quest[] {
  const sortRank = new Map<QuestPeriod, number>();
  return MVA_QUEST_SEEDS.map((r) => {
    const n = sortRank.get(r.period) ?? 0;
    sortRank.set(r.period, n + 1);
    const occurrence = r.occurrence;
    return {
      id: `quest-mva-${r.period}-${r.slot}`,
      period: r.period,
      title: r.title,
      completed: false,
      expReward: r.expReward,
      staminaCost: r.staminaCost,
      minCompletionTime: r.minCompletionTime,
      compensationType: r.compensationType,
      occurrence,
      sortOrder: n * 10,
      maxCompletionsPerDay: maxFromOccurrence(occurrence),
    };
  });
}

export function defaultMvaQuestIdSet(): Set<string> {
  return new Set(
    MVA_QUEST_SEEDS.map((r) => `quest-mva-${r.period}-${r.slot}`)
  );
}
