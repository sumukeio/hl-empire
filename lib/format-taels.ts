/** 御案银两展示（国库、军费、内帑、度支等）：固定保留两位小数 */
export function formatTaels(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
