/** 七大地理分区 · 省/直辖市 fullName → 大区 id */

export type MacroRegionId =
  | "huabei"
  | "dongbei"
  | "huadong"
  | "huazhong"
  | "huanan"
  | "xinan"
  | "xibei";

export const MACRO_REGIONS: {
  id: MacroRegionId;
  name: string;
  sortOrder: number;
}[] = [
  { id: "huabei", name: "华北", sortOrder: 0 },
  { id: "dongbei", name: "东北", sortOrder: 1 },
  { id: "huadong", name: "华东", sortOrder: 2 },
  { id: "huazhong", name: "华中", sortOrder: 3 },
  { id: "huanan", name: "华南", sortOrder: 4 },
  { id: "xinan", name: "西南", sortOrder: 5 },
  { id: "xibei", name: "西北", sortOrder: 6 },
];

/** 省级行政区全称 → 大区 */
export const PROVINCE_FULL_NAME_TO_MACRO: Record<string, MacroRegionId> = {
  北京市: "huabei",
  天津市: "huabei",
  河北省: "huabei",
  山西省: "huabei",
  内蒙古自治区: "huabei",
  辽宁省: "dongbei",
  吉林省: "dongbei",
  黑龙江省: "dongbei",
  上海市: "huadong",
  江苏省: "huadong",
  浙江省: "huadong",
  安徽省: "huadong",
  福建省: "huadong",
  江西省: "huadong",
  山东省: "huadong",
  台湾省: "huadong",
  河南省: "huazhong",
  湖北省: "huazhong",
  湖南省: "huazhong",
  广东省: "huanan",
  广西壮族自治区: "huanan",
  海南省: "huanan",
  香港特别行政区: "huanan",
  澳门特别行政区: "huanan",
  重庆市: "xinan",
  四川省: "xinan",
  贵州省: "xinan",
  云南省: "xinan",
  西藏自治区: "xinan",
  陕西省: "xibei",
  甘肃省: "xibei",
  青海省: "xibei",
  宁夏回族自治区: "xibei",
  新疆维吾尔自治区: "xibei",
};

/** 省级短名（舆图折叠标题）→ 大区 */
export const PROVINCE_SHORT_NAME_TO_MACRO: Record<string, MacroRegionId> = {
  北京: "huabei",
  天津: "huabei",
  河北: "huabei",
  山西: "huabei",
  内蒙古: "huabei",
  辽宁: "dongbei",
  吉林: "dongbei",
  黑龙江: "dongbei",
  上海: "huadong",
  江苏: "huadong",
  浙江: "huadong",
  安徽: "huadong",
  福建: "huadong",
  江西: "huadong",
  山东: "huadong",
  台湾: "huadong",
  河南: "huazhong",
  湖北: "huazhong",
  湖南: "huazhong",
  广东: "huanan",
  广西: "huanan",
  海南: "huanan",
  香港: "huanan",
  澳门: "huanan",
  重庆: "xinan",
  四川: "xinan",
  贵州: "xinan",
  云南: "xinan",
  西藏: "xinan",
  陕西: "xibei",
  甘肃: "xibei",
  青海: "xibei",
  宁夏: "xibei",
  新疆: "xibei",
};

export function resolveMacroRegionId(
  fullName?: string,
  shortName?: string
): MacroRegionId {
  if (fullName && PROVINCE_FULL_NAME_TO_MACRO[fullName]) {
    return PROVINCE_FULL_NAME_TO_MACRO[fullName];
  }
  if (shortName && PROVINCE_SHORT_NAME_TO_MACRO[shortName]) {
    return PROVINCE_SHORT_NAME_TO_MACRO[shortName];
  }
  return "huabei";
}
