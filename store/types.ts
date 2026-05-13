export type CityStatus = 0 | 1 | 2 | 3;

export interface City {
  id: string;
  /** 叙事城池名，如「长安」 */
  name: string;
  /** 别名：对应实际产品 / 业务名，如「档案管理员」 */
  alias: string;
  status: CityStatus;
  memo: string;
  cpa: number;
  /** 累计线索 / 加粉（战报累加） */
  leads: number;
  orders: number;
  /** 帝国兵力：对应后台关键词数量 */
  troops: number;
  /** 军械装备：创意图 / 高级样式数量 */
  equipments: number;
  /** 农业等级 0–10（永久，跨日不重置） */
  agriLevel: number;
  /** 商业等级 0–10 */
  commLevel: number;
  /** 治安等级 0–10 */
  secuLevel: number;
  /** 农业经验（向下一级累计） */
  agriExp: number;
  commExp: number;
  secuExp: number;
  /** 本城已勘合的军机政务 id（与 questDailyCompletions 中 count>0 同步，兼容旧档与备份） */
  completedQuestIds: string[];
  /** 各政务在本城最近一次勘合时间戳（毫秒）；多次勘合时更新为最后一次 */
  questCompletedAt: Record<string, number>;
  /** 当前自然日内各任务已勘合次数；跨日 resetDailyQuests 时整表清空 */
  questDailyCompletions: Record<string, number>;
}

export type CityPatch = Partial<Omit<City, "id">>;

/** 城池「日结战报」录入（消耗从军费扣，累加至 cpa / leads / orders） */
export interface CityDailyReportData {
  dailySpend: number;
  dailyLeads: number;
  dailyOrders: number;
}

/** @deprecated 使用 CityDailyReportData */
export type DailyBattleReportInput = CityDailyReportData;

export type SubmitCityReportResult =
  | { ok: true }
  | { ok: false; reason: string };

/** @deprecated 使用 SubmitCityReportResult */
export type SubmitDailyReportResult = SubmitCityReportResult;

export type QuestPeriod = "早朝" | "晌午" | "傍晚" | "深夜";

export interface Quest {
  id: string;
  period: QuestPeriod;
  title: string;
  completed: boolean;
  expReward: number;
  staminaCost: number;
  /** 同一时辰内展示顺序，数值越小越靠上；可拖动调整 */
  sortOrder: number;
  /** 本城本自然日该任务最多可勘合次数（默认 1，跨日由 resetDailyQuests 清零计数） */
  maxCompletionsPerDay: number;
}

export type QuestPatch = Partial<Omit<Quest, "id">>;

export type EventLogType = "info" | "decree" | "battle" | "treasury";

/** 邸报「撤回」时可执行的状态回滚（按 kind 扩展） */
export type EventLogRevert =
  | {
      kind: "quest_complete";
      cityId: string;
      questId: string;
      staminaRestored: number;
      expSubtracted: number;
      /** 本条勘合结算时实际铸成的翻牌券张数（撤回时扣回） */
      tokensSubtracted: number;
      /** 本条勘合结算完成后的多巴胺池余量（0–14）；旧邸报无此字段时撤回不调整池 */
      postDopaminePool?: number;
      /** 本条勘合注入池内的功勋量（与 expSubtracted 通常相同） */
      dopamineExpFed?: number;
    };

export interface EventLog {
  id: string;
  time: number;
  message: string;
  type: EventLogType;
  /** 邸报关联之城池（多为产品别名或城名）。 */
  cityName?: string;
  /** 邸报强调样式（如国难级红字闪烁）。 */
  emphasis?: "calamity" | "goldFlash" | "crimsonDecree";
  /** 存在时：用户可撤回本条邸报并尽量回滚关联游戏状态 */
  revert?: EventLogRevert;
}

/** 户部「个人支用」资产分类（顶栏户部司帑 · 人民币 1:1 映射国库银两） */
export type PersonalExpenseCategory =
  | "imperial_provisions"
  | "wardrobe"
  | "digital_gear"
  | "infrastructure"
  | "imperial_travel";

/** `recordExpense`：按分类扣减 `gold` 并联动体力 / 文学 / 民心 / 多巴胺池 */
export interface RecordExpenseInput {
  amount: number;
  category: PersonalExpenseCategory;
  /** 万世基石：邸报追加「（镇国利器）」；额外 +2 民心 */
  cornerstone?: boolean;
  /** 「九州问道」邸报括号内地点，缺省为「九州」 */
  travelDestination?: string;
}
