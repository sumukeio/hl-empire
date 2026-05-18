import type {
  QuestWorkOperationKind,
  QuestWorkSessionStatus,
} from "@/store/types";

export const WORK_OPERATION_LABEL: Record<QuestWorkOperationKind, string> = {
  timer_start: "点卯开表",
  timer_pause: "暂停",
  timer_resume: "继续",
  timer_cancel: "撤点卯",
  complete: "呈报完成",
  sop_complete: "改易呈报",
  shoddy_void: "草率作废",
  batch_start: "集团军开表",
  batch_complete: "集团军呈报",
  batch_cancel: "集团军撤点卯",
};

export const WORK_SESSION_STATUS_LABEL: Record<
  QuestWorkSessionStatus,
  string
> = {
  open: "进行中",
  completed: "已呈报",
  cancelled: "已撤点卯",
  voided: "已作废",
};
