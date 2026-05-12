/** 根据累计经验值生成尊号（展示用，与 level 解耦）。 */
export function getImperialHonorific(exp: number): {
  era: string;
  rank: string;
  fullTitle: string;
} {
  if (exp < 100) {
    return { era: "潜龙", rank: "少府", fullTitle: "潜龙·少府" };
  }
  if (exp < 300) {
    return { era: "问鼎", rank: "诸侯", fullTitle: "问鼎·诸侯" };
  }
  if (exp < 600) {
    return { era: "昭昭", rank: "天子", fullTitle: "昭昭·天子" };
  }
  if (exp < 1000) {
    return { era: "景曜", rank: "圣主", fullTitle: "景曜·圣主" };
  }
  return { era: "瀚翎", rank: "天帝", fullTitle: "瀚翎·天帝" };
}
