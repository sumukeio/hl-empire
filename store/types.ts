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
  orders: number;
  /** 帝国兵力：对应后台关键词数量 */
  troops: number;
  /** 军械装备：创意图 / 高级样式数量 */
  equipments: number;
  /** 本城已勘合的军机政务 id（与 quest 模板 id 对应）。 */
  completedQuestIds: string[];
  /** 各政务在本城完成的时间戳（毫秒）。 */
  questCompletedAt: Record<string, number>;
}

export type CityPatch = Partial<Omit<City, "id">>;

export type QuestPeriod = "早朝" | "晌午" | "傍晚" | "深夜";

export interface Quest {
  id: string;
  period: QuestPeriod;
  title: string;
  completed: boolean;
  expReward: number;
  staminaCost: number;
}

export type QuestPatch = Partial<Omit<Quest, "id">>;

export type EventLogType = "info" | "decree" | "battle" | "treasury";

export interface EventLog {
  id: string;
  time: number;
  message: string;
  type: EventLogType;
  /** 邸报关联之疆域（多为产品别名或城名）。 */
  cityName?: string;
  /** 邸报强调样式（如国难级红字闪烁）。 */
  emphasis?: "calamity" | "goldFlash";
}
