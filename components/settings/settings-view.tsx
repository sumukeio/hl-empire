"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, GripVertical, LogOut, Plus, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { parseBulkCityNamesFromText } from "@/lib/parse-bulk-city-names";
import { EmpireArchivePanel } from "@/components/settings/empire-archive-panel";
import {
  createEmptyCity,
  createEmptyQuest,
  useEventStore,
  useMapStore,
  useQuestStore,
} from "@/store";
import type {
  City,
  CityPatch,
  EventLogType,
  Quest,
  QuestPatch,
  QuestPeriod,
} from "@/store/types";

const PERIODS: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

const field =
  "border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 focus-visible:ring-imperial-gold/25";

export function SettingsView() {
  const router = useRouter();
  const cities = useMapStore((s) => s.cities);
  const addCity = useMapStore((s) => s.addCity);
  const bulkAddCities = useMapStore((s) => s.bulkAddCities);
  const bulkRemoveCities = useMapStore((s) => s.bulkRemoveCities);
  const removeCity = useMapStore((s) => s.removeCity);
  const updateCity = useMapStore((s) => s.updateCity);

  const [bulkInput, setBulkInput] = useState("");
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    setSelectedCityIds((prev) =>
      prev.filter((id) => cities.some((c) => c.id === id))
    );
  }, [cities]);

  const quests = useQuestStore((s) => s.quests);
  const addQuest = useQuestStore((s) => s.addQuest);
  const removeQuest = useQuestStore((s) => s.removeQuest);
  const updateQuest = useQuestStore((s) => s.updateQuest);
  const bulkAddQuests = useQuestStore((s) => s.bulkAddQuests);
  const bulkRemoveQuests = useQuestStore((s) => s.bulkRemoveQuests);
  const reorderQuestsInPeriod = useQuestStore((s) => s.reorderQuestsInPeriod);
  const addLog = useEventStore((s) => s.addLog);

  const [questBulkText, setQuestBulkText] = useState("");
  const [selectedQuestIds, setSelectedQuestIds] = useState<string[]>([]);
  const [questBulkDeleteOpen, setQuestBulkDeleteOpen] = useState(false);
  const [questImportResultOpen, setQuestImportResultOpen] = useState(false);
  const [questImportSummary, setQuestImportSummary] = useState("");

  useEffect(() => {
    setSelectedQuestIds((prev) =>
      prev.filter((id) => quests.some((q) => q.id === id))
    );
  }, [quests]);

  const sortedQuests = useMemo(() => {
    const order = new Map(PERIODS.map((p, i) => [p, i]));
    return [...quests].sort((a, b) => {
      const da = (order.get(a.period) ?? 99) - (order.get(b.period) ?? 99);
      if (da !== 0) return da;
      const oa = a.sortOrder ?? 0;
      const ob = b.sortOrder ?? 0;
      if (oa !== ob) return oa - ob;
      return a.id.localeCompare(b.id);
    });
  }, [quests]);

  const [dragQuestId, setDragQuestId] = useState<string | null>(null);

  const handleQuestDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragQuestId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleQuestDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleQuestDrop = useCallback(
    (e: React.DragEvent, targetId: string, period: QuestPeriod) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("text/plain");
      const dragId = raw || dragQuestId;
      setDragQuestId(null);
      if (!dragId || dragId === targetId) return;
      const qDrag = quests.find((q) => q.id === dragId);
      const qTar = quests.find((q) => q.id === targetId);
      if (!qDrag || !qTar || qDrag.period !== period || qTar.period !== period) return;
      const inPeriod = sortedQuests.filter((q) => q.period === period);
      const ordered = inPeriod.map((q) => q.id);
      const from = ordered.indexOf(dragId);
      const to = ordered.indexOf(targetId);
      if (from < 0 || to < 0) return;
      const next = [...ordered];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      reorderQuestsInPeriod(period, next);
    },
    [dragQuestId, quests, sortedQuests, reorderQuestsInPeriod]
  );

  const handleQuestDragEnd = useCallback(() => {
    setDragQuestId(null);
  }, []);

  const allQuestsSelected =
    quests.length > 0 && selectedQuestIds.length === quests.length;
  const someQuestsSelected =
    selectedQuestIds.length > 0 && selectedQuestIds.length < quests.length;

  const onBulkExpand = () => {
    const names = parseBulkCityNamesFromText(bulkInput);
    const { addedCount, skippedCount } = bulkAddCities(names);
    if (addedCount === 0 && skippedCount === 0) return;
    if (addedCount > 0 && skippedCount > 0) {
      addLog(
        `造办处：成功拓土 ${addedCount} 座城池，${skippedCount} 座已存在或重复已跳过。`,
        "decree"
      );
    } else if (addedCount > 0) {
      addLog(
        `造办处：成功拓土 ${addedCount} 座城池。圣上威武，帝国版图日新！`,
        "decree"
      );
    } else {
      addLog(
        `造办处：未新增城池，${skippedCount} 项名称已存在或重复已跳过。`,
        "decree"
      );
    }
    if (addedCount > 0) setBulkInput("");
  };

  const onAddCity = () => {
    const c = createEmptyCity({ name: "新城", alias: "" });
    const added = addCity(c);
    if (added) {
      addLog(`造办处：已扩建城池【${c.name}】`, "decree");
    } else {
      addLog(
        `造办处：城池「${c.name.trim() || "（空名）"}」已存在，未重复扩建。`,
        "decree"
      );
    }
  };

  const onConfirmBulkDelete = () => {
    const n = selectedCityIds.length;
    if (n === 0) return;
    bulkRemoveCities(selectedCityIds);
    addLog(`造办处：圣上雷霆手腕，已将 ${n} 座城池削藩抹除。`, "decree");
    setSelectedCityIds([]);
    setBulkDeleteOpen(false);
  };

  const allCitiesSelected =
    cities.length > 0 && selectedCityIds.length === cities.length;
  const someCitiesSelected =
    selectedCityIds.length > 0 && selectedCityIds.length < cities.length;

  const onRemoveCity = (city: City) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`确定裁撤城池「${city.name}」？此操作不可撤销。`)
    ) {
      return;
    }
    removeCity(city.id);
    addLog(`造办处：已裁撤城池【${city.name}】`, "decree");
  };

  const onAddQuest = () => {
    const q = createEmptyQuest({ period: "早朝", title: "新政务" });
    addQuest(q);
    addLog(`枢密院：已新增【${q.period}】政务条目《${q.title}》`, "decree");
  };

  const onQuestBulkImport = () => {
    const { added, errors } = bulkAddQuests(questBulkText);
    const errText = errors
      .map((e) => `第 ${e.line} 行：${e.message}`)
      .join("\n");
    if (added > 0) {
      setQuestImportSummary(
        errors.length > 0
          ? `成功下发 ${added} 条政务入军机。\n\n以下行未导入：\n${errText}`
          : `成功下发 ${added} 条政务入军机，格式校验全部通过。`
      );
      addLog(`枢密院：一键下发大纲，新增 ${added} 条政务。`, "decree");
      setQuestBulkText("");
    } else if (errors.length > 0) {
      setQuestImportSummary(`未新增政务。解析问题如下：\n\n${errText}`);
    } else {
      setQuestImportSummary(
        "没有可解析的非空行。示例：\n【户部】核算…|晌午|10|5\n或 Tab 分列四段。"
      );
    }
    setQuestImportResultOpen(true);
  };

  const onLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // 未配置 Supabase 时仍退回登录页
    }
    router.replace("/login");
    router.refresh();
  };

  const onConfirmQuestBulkDelete = () => {
    const n = selectedQuestIds.length;
    if (n === 0) return;
    bulkRemoveQuests(selectedQuestIds);
    addLog(
      `枢密院：圣上手谕，已将 ${n} 条政务从军机处永久除名。`,
      "decree"
    );
    setSelectedQuestIds([]);
    setQuestBulkDeleteOpen(false);
  };

  return (
    <>
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-imperial-gold/15 bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              回朝
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-border text-muted-foreground hover:bg-muted/30"
            onClick={() => void onLogout()}
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="order-last gap-2 border-imperial-gold/45 text-imperial-gold hover:bg-imperial-gold/10 sm:order-none"
            asChild
          >
            <Link href="/settings/handbook">
              <BookOpen className="h-4 w-4" />
              帝国手册
            </Link>
          </Button>
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <h1 className="text-lg font-semibold tracking-tight text-primary sm:text-xl">
              造办处
            </h1>
            <p className="text-xs text-slate-500">
              图志司 · 枢密院 · 帝国档案 — 配置实时写入御案（localStorage）
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Tabs defaultValue="territory" className="flex flex-col gap-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-900/80 p-1 sm:w-auto">
            <TabsTrigger
              value="territory"
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              图志司
            </TabsTrigger>
            <TabsTrigger
              value="council"
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              枢密院
            </TabsTrigger>
            <TabsTrigger
              value="archive"
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              帝国档案
            </TabsTrigger>
          </TabsList>

          <TabsContent value="territory" className="mt-0 outline-none">
            <div className="rounded-xl border border-imperial-gold/20 bg-slate-900/40 p-4 shadow-inner sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-primary">
                    征战目标管理
                  </h2>
                  <p className="text-xs text-slate-500">
                    城池名与产品别名；九州图志卡片将显示别名
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={onAddCity}
                  >
                    <Plus className="h-4 w-4" />
                    新增城池
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={selectedCityIds.length === 0}
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    雷霆削藩（批量删除）
                  </Button>
                </div>
              </div>

              <div className="mb-4 space-y-2 rounded-lg border border-imperial-gold/25 bg-slate-950/30 p-3 sm:p-4">
                <Label
                  htmlFor="bulk-cities"
                  className="text-xs text-slate-400"
                >
                  批量拓土（顿号、中英文逗号或空格分隔，如：建康、金陵 扬州）
                </Label>
                <Textarea
                  id="bulk-cities"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="建康、金陵、扬州"
                  rows={3}
                  className={cn("min-h-[5.5rem] resize-y text-sm", field)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-imperial-gold/50 text-imperial-gold hover:bg-imperial-gold/10 sm:w-auto"
                  onClick={onBulkExpand}
                >
                  批量拓土
                </Button>
              </div>

              <ScrollArea className="h-[min(60vh,520px)] rounded-lg border border-slate-800/90 pr-3">
                <div className="space-y-0 p-2">
                  {cities.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">
                      暂无城池。点击「新增城池」以扩充征战目标。
                    </p>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                        <Checkbox
                          id="select-all-cities"
                          disabled={cities.length === 0}
                          checked={
                            allCitiesSelected
                              ? true
                              : someCitiesSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(v) => {
                            if (v === true) {
                              setSelectedCityIds(cities.map((c) => c.id));
                            } else if (v === false) {
                              setSelectedCityIds([]);
                            }
                          }}
                          aria-label="全选城池"
                        />
                        <Label
                          htmlFor="select-all-cities"
                          className="cursor-pointer text-xs font-medium text-slate-400"
                        >
                          全选
                        </Label>
                      </div>
                      {cities.map((city) => (
                        <CityRow
                          key={city.id}
                          city={city}
                          selected={selectedCityIds.includes(city.id)}
                          onSelectedChange={(checked) => {
                            setSelectedCityIds((prev) =>
                              checked
                                ? prev.includes(city.id)
                                  ? prev
                                  : [...prev, city.id]
                                : prev.filter((id) => id !== city.id)
                            );
                          }}
                          onRemove={() => onRemoveCity(city)}
                          updateCity={updateCity}
                          addLog={addLog}
                        />
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="council" className="mt-0 outline-none">
            <div className="rounded-xl border border-imperial-gold/20 bg-slate-900/40 p-4 shadow-inner sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-primary">
                    政务配置
                  </h2>
                  <p className="text-xs text-slate-500">
                    紧凑列表；支持批量下发大纲与批量除名
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onAddQuest}
                >
                  <Plus className="h-4 w-4" />
                  新增政务
                </Button>
              </div>

              <div className="mb-4 space-y-2 rounded-lg border border-imperial-gold/30 bg-slate-950/35 p-3 sm:p-4">
                <Label
                  htmlFor="bulk-quests"
                  className="text-xs text-imperial-gold/90"
                >
                  批量导入（每行一条）优先{" "}
                  <strong className="text-imperial-gold">Tab</strong> 四列；手打推荐{" "}
                  <strong className="text-imperial-gold">标题|时段|功勋|体力</strong>
                  ；亦可用逗号且标题可含逗号（末三格为时段、功勋、体力）。输入框内按 Tab
                  会插入制表符。
                </Label>
                <Textarea
                  id="bulk-quests"
                  value={questBulkText}
                  onChange={(e) => setQuestBulkText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Tab") return;
                    e.preventDefault();
                    const ta = e.currentTarget;
                    const start = ta.selectionStart ?? 0;
                    const end = ta.selectionEnd ?? 0;
                    const v = ta.value;
                    setQuestBulkText(v.slice(0, start) + "\t" + v.slice(end));
                    requestAnimationFrame(() => {
                      ta.selectionStart = ta.selectionEnd = start + 1;
                    });
                  }}
                  placeholder="户部核算|晌午|10|5  或  标题列\t晌午\t10\t5"
                  rows={4}
                  className={cn(
                    "min-h-[6rem] resize-y border-slate-800 bg-slate-950/80 text-sm text-slate-100 placeholder:text-slate-600",
                    "focus-visible:border-imperial-gold/50 focus-visible:ring-imperial-gold/20"
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-imperial-gold/55 text-imperial-gold hover:bg-imperial-gold/10 sm:w-auto"
                  onClick={onQuestBulkImport}
                >
                  一键下发大纲（批量导入）
                </Button>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-3 border-b border-slate-800/90 pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-quests"
                    disabled={quests.length === 0}
                    checked={
                      allQuestsSelected
                        ? true
                        : someQuestsSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(v) => {
                      if (v === true) {
                        setSelectedQuestIds(quests.map((q) => q.id));
                      } else if (v === false) {
                        setSelectedQuestIds([]);
                      }
                    }}
                    aria-label="全选政务"
                  />
                  <Label
                    htmlFor="select-all-quests"
                    className="cursor-pointer text-xs font-medium text-slate-400"
                  >
                    全选
                  </Label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={selectedQuestIds.length === 0}
                  onClick={() => setQuestBulkDeleteOpen(true)}
                  className="border border-imperial-vermilion/40 bg-imperial-vermilion/90 text-white hover:bg-imperial-vermilion"
                >
                  废除政务（批量删除）
                </Button>
              </div>

              <div className="hidden border-b border-slate-800/90 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[auto_auto_minmax(0,1fr)_6.5rem_4.5rem_4.5rem_auto] sm:gap-2 sm:px-2">
                <span className="w-5 text-center" title="同辰内拖动排序">
                  序
                </span>
                <span className="w-4" aria-hidden />
                <span>任务标题</span>
                <span>时辰</span>
                <span>功勋</span>
                <span>体力</span>
                <span className="text-center">操作</span>
              </div>

              <ScrollArea className="h-[min(60vh,480px)] rounded-lg border border-slate-800/90 pr-2">
                <div className="min-w-0 p-1">
                  {quests.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">
                      暂无政务。可点击「新增政务」或使用上方批量导入。
                    </p>
                  ) : (
                    sortedQuests.map((q) => (
                      <CompactQuestRow
                        key={q.id}
                        quest={q}
                        selected={selectedQuestIds.includes(q.id)}
                        onDragStartRow={(e) => handleQuestDragStart(e, q.id)}
                        onDragOverRow={handleQuestDragOver}
                        onDropRow={(e) => handleQuestDrop(e, q.id, q.period)}
                        onDragEndRow={handleQuestDragEnd}
                        onSelectedChange={(checked) => {
                          setSelectedQuestIds((prev) =>
                            checked
                              ? prev.includes(q.id)
                                ? prev
                                : [...prev, q.id]
                              : prev.filter((id) => id !== q.id)
                          );
                        }}
                        updateQuest={updateQuest}
                        removeQuest={removeQuest}
                        addLog={addLog}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="archive" className="mt-0 outline-none">
            <EmpireArchivePanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>

    <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
      <AlertDialogContent className="border-imperial-vermilion/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-imperial-vermilion">
            雷霆削藩
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            确定要将这 {selectedCityIds.length}{" "}
            座城池从九州图志征战目标中彻底抹除吗？相关度支与军机备忘将永久销毁。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800">
            留中不发
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={onConfirmBulkDelete}
          >
            确认抹除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={questBulkDeleteOpen} onOpenChange={setQuestBulkDeleteOpen}>
      <AlertDialogContent className="border-imperial-vermilion/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-imperial-vermilion">
            废除政务
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            确定要将选中的 {selectedQuestIds.length}{" "}
            条政务从军机处除名吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800">
            留中不发
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={onConfirmQuestBulkDelete}
          >
            确认除名
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={questImportResultOpen}
      onOpenChange={setQuestImportResultOpen}
    >
      <AlertDialogContent className="border-slate-800 bg-slate-950">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-imperial-gold">
            批量导入结果
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="max-h-[min(50vh,20rem)] overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-slate-300">
              {questImportSummary}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="bg-imperial-gold/90 text-slate-950 hover:bg-imperial-gold">
            知道了
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function CityRow({
  city,
  selected,
  onSelectedChange,
  onRemove,
  updateCity,
  addLog,
}: {
  city: City;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onRemove: () => void;
  updateCity: (id: string, data: CityPatch) => void;
  addLog: (
    message: string,
    type?: EventLogType,
    meta?: { cityName?: string }
  ) => void;
}) {
  const nameSnap = useRef(city.name);
  const aliasSnap = useRef(city.alias);

  const onNameFocus = () => {
    nameSnap.current = city.name;
  };
  const onNameBlur = () => {
    const latest = useMapStore
      .getState()
      .cities.find((c) => c.id === city.id);
    if (!latest) return;
    if (latest.name !== nameSnap.current) {
      addLog(`造办处：已修订城池叙事名为「${latest.name}」`, "decree");
    }
    nameSnap.current = latest.name;
  };

  const onAliasFocus = () => {
    aliasSnap.current = city.alias;
  };
  const onAliasBlur = () => {
    const latest = useMapStore
      .getState()
      .cities.find((c) => c.id === city.id);
    if (!latest) return;
    if (latest.alias !== aliasSnap.current) {
      addLog(
        `造办处：已修订城池「${latest.name}」产品别名为「${latest.alias || "（空）"}」`,
        "decree"
      );
    }
    aliasSnap.current = latest.alias;
  };

  return (
    <div className="space-y-4 border-b border-slate-800/80 py-4 last:border-0">
      <div className="flex gap-3 sm:gap-4">
        <div className="flex shrink-0 flex-col items-center pt-6">
          <Checkbox
            id={`city-sel-${city.id}`}
            checked={selected}
            onCheckedChange={(v) => {
              if (v === "indeterminate") return;
              onSelectedChange(v === true);
            }}
            aria-label={`选中 ${city.name}`}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">城池名</Label>
          <Input
            value={city.name}
            onChange={(e) => updateCity(city.id, { name: e.target.value })}
            onFocus={onNameFocus}
            onBlur={onNameBlur}
            className={cn("h-9", field)}
            placeholder="如：长安"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">产品别名</Label>
          <Input
            value={city.alias}
            onChange={(e) => updateCity(city.id, { alias: e.target.value })}
            onFocus={onAliasFocus}
            onBlur={onAliasBlur}
            className={cn("h-9", field)}
            placeholder="如：图书管理员证"
          />
        </div>
        <div className="flex justify-end sm:pb-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:bg-rose-950/40 hover:text-imperial-vermilion"
            onClick={onRemove}
            aria-label={`裁撤 ${city.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">度支 (CPA)</Label>
          <Input
            inputMode="numeric"
            value={String(city.cpa)}
            onChange={(e) => {
              const v = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
              updateCity(city.id, { cpa: v });
            }}
            className={cn("h-9", field)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">线索 (粉)</Label>
          <Input
            inputMode="numeric"
            value={String(city.leads ?? 0)}
            onChange={(e) => {
              const v = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
              updateCity(city.id, { leads: v });
            }}
            className={cn("h-9", field)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">粮饷 (单)</Label>
          <Input
            inputMode="numeric"
            value={String(city.orders)}
            onChange={(e) => {
              const v = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
              updateCity(city.id, { orders: v });
            }}
            className={cn("h-9", field)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">兵力（关键词）</Label>
          <Input
            inputMode="numeric"
            value={String(city.troops)}
            onChange={(e) => {
              const v = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
              updateCity(city.id, { troops: v });
            }}
            className={cn("h-9", field)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">军械（创意样式）</Label>
          <Input
            inputMode="numeric"
            value={String(city.equipments)}
            onChange={(e) => {
              const v = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
              updateCity(city.id, { equipments: v });
            }}
            className={cn("h-9", field)}
          />
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}

function CompactQuestRow({
  quest,
  selected,
  onSelectedChange,
  updateQuest,
  removeQuest,
  addLog,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
  onDragEndRow,
}: {
  quest: Quest;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  updateQuest: (id: string, data: QuestPatch) => void;
  removeQuest: (id: string) => void;
  addLog: (
    message: string,
    type?: EventLogType,
    meta?: { cityName?: string }
  ) => void;
  onDragStartRow: (e: React.DragEvent) => void;
  onDragOverRow: (e: React.DragEvent) => void;
  onDropRow: (e: React.DragEvent) => void;
  onDragEndRow: () => void;
}) {
  const titleSnap = useRef(quest.title);
  const expSnap = useRef(quest.expReward);
  const stSnap = useRef(quest.staminaCost);
  const maxDaySnap = useRef(quest.maxCompletionsPerDay ?? 1);

  const logNumericChange = (label: "功勋" | "体力") => {
    const latest = useQuestStore
      .getState()
      .quests.find((q) => q.id === quest.id);
    if (!latest) return;
    addLog(
      `枢密院：已调整【${latest.period}】《${latest.title}》${label}（${
        label === "功勋" ? latest.expReward : latest.staminaCost
      }）`,
      "decree"
    );
  };

  const onTitleFocus = () => {
    titleSnap.current = quest.title;
  };
  const onTitleBlur = () => {
    const latest = useQuestStore
      .getState()
      .quests.find((q) => q.id === quest.id);
    if (!latest) return;
    if (latest.title !== titleSnap.current) {
      addLog(
        `枢密院：已修订【${latest.period}】政务《${latest.title}》`,
        "decree"
      );
    }
    titleSnap.current = latest.title;
  };

  const onPeriodValueChange = (p: QuestPeriod) => {
    if (p === quest.period) return;
    const prev = quest.period;
    updateQuest(quest.id, { period: p });
    addLog(
      `枢密院：已将《${quest.title}》自【${prev}】调至【${p}】`,
      "decree"
    );
  };

  const onExpFocus = () => {
    expSnap.current = quest.expReward;
  };
  const onExpBlur = () => {
    const latest = useQuestStore
      .getState()
      .quests.find((q) => q.id === quest.id);
    if (!latest) return;
    if (latest.expReward !== expSnap.current) logNumericChange("功勋");
    expSnap.current = latest.expReward;
  };

  const onStFocus = () => {
    stSnap.current = quest.staminaCost;
  };
  const onStBlur = () => {
    const latest = useQuestStore
      .getState()
      .quests.find((q) => q.id === quest.id);
    if (!latest) return;
    if (latest.staminaCost !== stSnap.current) logNumericChange("体力");
    stSnap.current = latest.staminaCost;
  };

  const onMaxDayFocus = () => {
    maxDaySnap.current = quest.maxCompletionsPerDay ?? 1;
  };
  const onMaxDayBlur = () => {
    const latest = useQuestStore
      .getState()
      .quests.find((q) => q.id === quest.id);
    if (!latest) return;
    const cur = latest.maxCompletionsPerDay ?? 1;
    if (cur !== maxDaySnap.current) {
      addLog(
        `枢密院：已调整《${latest.title}》本日勘合上限（${cur}）`,
        "decree"
      );
    }
    maxDaySnap.current = cur;
  };

  const onRowRemove = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`确定移除政务「${quest.title}」？`)
    ) {
      return;
    }
    removeQuest(quest.id);
    addLog(`枢密院：已移除政务《${quest.title}》`, "decree");
  };

  const cell =
    "h-8 border-slate-800 bg-slate-950/90 text-xs text-slate-100 shadow-sm focus-visible:border-imperial-gold/45 focus-visible:ring-1 focus-visible:ring-imperial-gold/25";

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 border-b border-slate-800/80 py-2 last:border-0 sm:grid-cols-[auto_auto_minmax(0,1fr)_6.5rem_3.25rem_4.5rem_4.5rem_auto]",
        "items-center px-1 sm:gap-2 sm:px-2"
      )}
      onDragOver={onDragOverRow}
      onDrop={onDropRow}
      onDragEnd={onDragEndRow}
    >
      <div
        className="hidden cursor-grab items-center justify-center self-center active:cursor-grabbing sm:flex"
        draggable
        onDragStart={onDragStartRow}
        role="button"
        tabIndex={0}
        aria-label={`拖动调整顺序：${quest.title}`}
        title="拖动排序（仅同时辰内有效）"
      >
        <GripVertical className="h-4 w-4 text-slate-600" aria-hidden />
      </div>
      <div className="flex items-center justify-start sm:justify-center">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => {
            if (v === "indeterminate") return;
            onSelectedChange(v === true);
          }}
          aria-label={`选中 ${quest.title}`}
          className="border-slate-600 data-[state=checked]:border-imperial-gold data-[state=checked]:bg-imperial-gold"
        />
      </div>
      <Input
        value={quest.title}
        onChange={(e) => updateQuest(quest.id, { title: e.target.value })}
        onFocus={onTitleFocus}
        onBlur={onTitleBlur}
        className={cn("min-w-0", cell)}
      />
      <Select
        value={quest.period}
        onValueChange={(v) => onPeriodValueChange(v as QuestPeriod)}
      >
        <SelectTrigger className={cn("h-8 w-full text-xs", cell)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-col gap-0.5 sm:contents">
        <Label className="text-[10px] text-slate-500 sm:sr-only">日限</Label>
        <Input
          type="number"
          min={1}
          max={99}
          title="本自然日每城最多勘合次数"
          aria-label={`${quest.title} 本日勘合上限`}
          value={quest.maxCompletionsPerDay ?? 1}
          onChange={(e) =>
            updateQuest(quest.id, {
              maxCompletionsPerDay: Math.min(
                99,
                Math.max(1, Number.parseInt(e.target.value, 10) || 1)
              ),
            })
          }
          onFocus={onMaxDayFocus}
          onBlur={onMaxDayBlur}
          className={cn("w-full tabular-nums", cell)}
        />
      </div>
      <Input
        type="number"
        min={0}
        value={quest.expReward}
        onChange={(e) =>
          updateQuest(quest.id, {
            expReward: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
          })
        }
        onFocus={onExpFocus}
        onBlur={onExpBlur}
        className={cn("w-full tabular-nums", cell)}
      />
      <Input
        type="number"
        min={0}
        value={quest.staminaCost}
        onChange={(e) =>
          updateQuest(quest.id, {
            staminaCost: Math.max(
              0,
              Number.parseInt(e.target.value, 10) || 0
            ),
          })
        }
        onFocus={onStFocus}
        onBlur={onStBlur}
        className={cn("w-full tabular-nums", cell)}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-500 hover:bg-rose-950/40 hover:text-imperial-vermilion"
          onClick={onRowRemove}
          aria-label={`移除 ${quest.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
