/** 宵禁：健康低于此值进入强制休养 */
export const CURFEW_HEALTH_THRESHOLD = 30;
/** 早朝停办：体力低于此值且处于早朝时段 */
export const EARLY_COURT_STAMINA_THRESHOLD = 40;
/** 娱乐透支惩罚：开启娱乐时健康低于此值，每轮结束额外扣健康 */
export const ENTERTAINMENT_LOW_HEALTH_THRESHOLD = 50;

export function isCurfewMode(health: number): boolean {
  return health < CURFEW_HEALTH_THRESHOLD;
}

/** 早朝时段 08:00–11:30（含头不含尾：11:30 起算停办窗口结束） */
export function isEarlyCourtHours(d = new Date()): boolean {
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins >= 8 * 60 && mins < 11 * 60 + 30;
}

export function isEarlyCourtTaskBlocked(
  stamina: number,
  period: string,
  now = new Date()
): boolean {
  return (
    period === "早朝" &&
    stamina < EARLY_COURT_STAMINA_THRESHOLD &&
    isEarlyCourtHours(now)
  );
}
