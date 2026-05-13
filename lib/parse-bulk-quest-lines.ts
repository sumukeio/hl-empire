import type { Quest, QuestPeriod } from "@/store/types";

const PERIODS: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

function isQuestPeriod(s: string): s is QuestPeriod {
  return PERIODS.includes(s as QuestPeriod);
}

export type BulkQuestDraft = Pick<
  Quest,
  "title" | "period" | "expReward" | "staminaCost"
>;

export type BulkQuestParseError = { line: number; message: string };

type ParseLineResult =
  | { ok: true; draft: BulkQuestDraft }
  | { ok: false; message: string };

function buildDraft(
  title: string,
  periodRaw: string,
  expPart: string | undefined,
  staminaPart: string | undefined
): ParseLineResult {
  const t = title.trim();
  if (!t) {
    return { ok: false, message: "标题为空" };
  }
  if (!isQuestPeriod(periodRaw)) {
    return {
      ok: false,
      message: `无效时段「${periodRaw}」，须为：早朝 / 晌午 / 傍晚 / 深夜`,
    };
  }

  const expParsed = expPart !== undefined ? Number.parseInt(expPart, 10) : NaN;
  const staminaParsed =
    staminaPart !== undefined ? Number.parseInt(staminaPart, 10) : NaN;

  const expReward = Number.isFinite(expParsed) ? Math.max(0, expParsed) : 10;
  const staminaCost = Number.isFinite(staminaParsed)
    ? Math.max(0, staminaParsed)
    : 5;

  return {
    ok: true,
    draft: {
      title: t,
      period: periodRaw,
      expReward,
      staminaCost,
    },
  };
}

/**
 * 解析单行，优先级：
 * 1) **Tab** 分列（推荐；标题可含逗号；在输入框内按 Tab 会插入制表符）
 * 2) **竖线 |** 分列（手打效率最高，标题内勿用 |）
 * 3) **逗号** 分列：取 **最后三段** 为时段、功勋、体力，前面合并为标题（标题可含中英文逗号）
 * 4) 无逗号时按 **空白** 分列，末三格为时段、功勋、体力
 */
export function parseQuestLineResult(line: string): ParseLineResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, message: "空行" };
  }

  if (trimmed.includes("\t")) {
    const parts = trimmed
      .split("\t")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length < 4) {
      return {
        ok: false,
        message: "Tab 分列至少 4 段：标题（可含多段 Tab）、时段、功勋、体力",
      };
    }
    const title = parts.slice(0, -3).join("\t");
    const periodRaw = parts[parts.length - 3]!;
    const expPart = parts[parts.length - 2];
    const staminaPart = parts[parts.length - 1];
    return buildDraft(title, periodRaw, expPart, staminaPart);
  }

  if (trimmed.includes("|")) {
    const parts = trimmed
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length < 4) {
      return {
        ok: false,
        message: "竖线 | 分列至少 4 段：标题 | 时段 | 功勋 | 体力",
      };
    }
    const title = parts.slice(0, -3).join("|");
    const periodRaw = parts[parts.length - 3]!;
    const expPart = parts[parts.length - 2];
    const staminaPart = parts[parts.length - 1];
    return buildDraft(title, periodRaw, expPart, staminaPart);
  }

  const commaParts = trimmed
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (commaParts.length >= 4) {
    const title = commaParts.slice(0, -3).join("，");
    const periodRaw = commaParts[commaParts.length - 3]!;
    const expPart = commaParts[commaParts.length - 2];
    const staminaPart = commaParts[commaParts.length - 1];
    return buildDraft(title, periodRaw, expPart, staminaPart);
  }

  const segments = trimmed.split(/\s+/).filter(Boolean);
  if (segments.length < 4) {
    return {
      ok: false,
      message:
        "字段不足。推荐：标题|时段|功勋|体力 ；或 Tab 四列；逗号格式时标题与时段间请用逗号且时段/功勋/体力占最后三格",
    };
  }
  const periodRaw = segments[segments.length - 3]!;
  const expPart = segments[segments.length - 2];
  const staminaPart = segments[segments.length - 1];
  const title = segments.slice(0, -3).join(" ");
  return buildDraft(title, periodRaw, expPart, staminaPart);
}

export function parseBulkQuestText(text: string): {
  items: BulkQuestDraft[];
  errors: BulkQuestParseError[];
} {
  const lines = text.split(/\r?\n/);
  const items: BulkQuestDraft[] = [];
  const errors: BulkQuestParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const lineNum = i + 1;
    if (!raw.trim()) continue;

    const r = parseQuestLineResult(raw);
    if (!r.ok) {
      errors.push({ line: lineNum, message: r.message });
      continue;
    }
    items.push(r.draft);
  }

  return { items, errors };
}
