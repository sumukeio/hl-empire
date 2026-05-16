export { rehydrateAllStores } from "./rehydrate";
export {
  useEmperorStore,
  DOPAMINE_ENERGY_PER_TICKET,
  DOPAMINE_POOL_MAX,
  clampDopaminePool,
} from "./emperor-store";
export {
  useMapStore,
  createDefaultCities,
  createEmptyCity,
  getQuestDailyCount,
  isQuestFullyCompletedToday,
  pruneCityQuestProgress,
} from "./map-store";
export {
  TONGWU_SI_CITY_ID,
  TONGWU_SI_DEFAULT_NAME,
  createTongwuSiCityRecord,
  getTerritoryCities,
  isTongwuSiCity,
} from "@/lib/tongwu-si";
export {
  filterQuestsByAffiliation,
  filterQuestsForActiveCity,
  getQuestAffiliation,
  normalizeQuestAffiliation,
  questAffiliationLabel,
} from "@/lib/quest-affiliation";
export type { BulkAddCitiesResult, TourCityResult } from "./map-store";
export {
  useQuestStore,
  createDefaultQuests,
  createEmptyQuest,
  hydrateQuestSortOrderFromPersistOrder,
  QUEST_TIMER_CANCEL_WINDOW_MS,
  QUEST_TIMER_MAX_PAUSE_MS,
  getQuestTimerEffectiveElapsedMs,
  getQuestTimerPauseBudgetUsedMs,
  type ActiveBatchCampaignTimer,
  type BatchCampaignCompleteMeta,
  type BatchCampaignStartResult,
} from "./quest-store";
export type {
  BulkAddQuestsResult,
  ToggleQuestCompletionMeta,
  ToggleQuestRunResult,
  QuestTimerStartedAck,
  ActiveQuestTimer,
} from "./quest-store";
export { useEventStore } from "./event-store";
export {
  usePrefsStore,
  migrateLegacyPrefsFromLocalStorage,
  parsePrefsJson,
} from "./prefs-store";
export type { PrefsState } from "./prefs-store";
export type {
  City,
  CityDailyReportData,
  CityPatch,
  CityStatus,
  DailyBattleReportInput,
  PersonalExpenseCategory,
  CampaignPhase,
  Quest,
  QuestAffiliation,
  QuestCategory,
  QuestCompensationType,
  QuestOccurrence,
  QuestPatch,
  QuestPeriod,
  RecordExpenseInput,
  EventLog,
  EventLogType,
  SubmitCityReportResult,
  SubmitDailyReportResult,
} from "./types";
export {
  filterQuestsByCategory,
  getQuestCategory,
  questCategoryBadgeClass,
  questCategoryDotClass,
  questCategoryLabel,
  QUEST_CATEGORIES,
  QUEST_CATEGORY_FILTER_OPTIONS,
} from "@/lib/quest-category";
export type { QuestCategoryFilter } from "@/lib/quest-category";
export {
  CAMPAIGN_PHASES,
  campaignPhaseLabel,
  filterQuestsByCampaignPhase,
  getQuestCampaignPhase,
  normalizeCampaignPhase,
} from "@/lib/campaign-phase";