import type { City, Quest } from "@/store/types";

/** 生成军机勘合邸报文案（含疆域别名/城名）。 */
export function buildCourtDispatchDecree(
  quest: Quest,
  city: City
): { message: string; cityName: string } {
  const dept = quest.title.match(/^【[^】]+】/)?.[0] ?? "【军机】";
  const cityLabel = city.alias?.trim() || city.name;
  const body = quest.title.replace(/^【[^】]+】\s*/, "").trim() || quest.title;
  const headline =
    body.split(/[：:]/)[0]?.trim().slice(0, 24) || body.slice(0, 16);
  const message = `${dept}圣上已为【${cityLabel}】督办「${headline}」，军势大振。`;
  return { message, cityName: cityLabel };
}
