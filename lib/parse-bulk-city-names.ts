/** 按中文逗号、英文逗号、顿号或空白拆分城池名，并去重（保序）。 */
export function parseBulkCityNamesFromText(text: string): string[] {
  const parts = text.split(/[,，、\s]+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const n = p.trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}
