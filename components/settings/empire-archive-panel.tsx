"use client";

import { useRef, useState } from "react";
import { ArchiveRestore, FileDown, FileUp } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  applyEmpireBackup,
  parseEmpireBackupJson,
  triggerEmpireBackupDownload,
} from "@/lib/empire-backup";
import { useEventStore } from "@/store";

export function EmpireArchivePanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const addLog = useEventStore((s) => s.addLog);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [stagedRaw, setStagedRaw] = useState("");
  const [stagedSummary, setStagedSummary] = useState("");

  const onExport = () => {
    triggerEmpireBackupDownload();
    addLog("造办处：帝国密函已封装，可藏之名山。", "decree");
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseEmpireBackupJson(text);
      if (!parsed.ok) {
        setErrorMsg(parsed.error);
        setErrorOpen(true);
        return;
      }
      const { cities } = parsed.data.map;
      const { quests } = parsed.data.quest;
      const { logs } = parsed.data.events;
      setStagedRaw(text);
      setStagedSummary(
        `密函时间：${parsed.data.exportedAt}\n征战目标 ${cities.length} 座 · 军机 ${quests.length} 务 · 邸报 ${logs.length} 条`
      );
      setConfirmOpen(true);
    };
    reader.onerror = () => {
      setErrorMsg("无法读取所选文件。");
      setErrorOpen(true);
    };
    reader.readAsText(file, "utf-8");
  };

  const onConfirmImport = () => {
    const parsed = parseEmpireBackupJson(stagedRaw);
    if (!parsed.ok) {
      setConfirmOpen(false);
      return;
    }
    applyEmpireBackup(parsed.data);
    addLog("造办处：帝国密函已启封，一键魂穿，诸司复位。", "decree");
    setConfirmOpen(false);
    setStagedRaw("");
    setStagedSummary("");
  };

  return (
    <div className="rounded-xl border border-imperial-gold/20 bg-slate-900/40 p-4 shadow-inner sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-primary">帝国档案</h2>
        <p className="text-xs text-slate-500">
          导出 / 导入完整本地存档（皇帝、征战目标、军机、邸报）。导入将覆盖当前浏览器中的帝国数据。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-slate-800/90 bg-slate-950/40 p-4">
          <Label className="text-xs text-imperial-gold/90">封装密函</Label>
          <p className="text-[11px] leading-relaxed text-slate-500">
            将当前各御案数据汇总为 JSON 文件，文件名形如{" "}
            <span className="font-mono text-slate-400">
              hanling-empire-backup-YYYYMMDD.json
            </span>
          </p>
          <Button
            type="button"
            className="w-full gap-2 border-imperial-gold/50 bg-imperial-gold/15 text-imperial-gold hover:bg-imperial-gold/25"
            variant="outline"
            onClick={onExport}
          >
            <FileDown className="h-4 w-4" />
            封装帝国密函
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-800/90 bg-slate-950/40 p-4">
          <Label className="text-xs text-imperial-gold/90">读取密函</Label>
          <p className="text-[11px] leading-relaxed text-slate-500">
            选择此前封装的 JSON 文件，校验通过后需二次确认方可覆盖写入。
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-imperial-vermilion/40 text-imperial-vermilion hover:bg-imperial-vermilion/10"
            onClick={onPickFile}
          >
            <FileUp className="h-4 w-4" />
            读取帝国密函
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-md border border-slate-800/80 bg-slate-950/30 p-3 text-[11px] text-slate-500">
        <ArchiveRestore className="mt-0.5 h-4 w-4 shrink-0 text-imperial-gold/80" />
        <p>
          持久化键名：<span className="font-mono text-slate-400">hanling-emperor</span>、
          <span className="font-mono text-slate-400">hanling-map</span>、
          <span className="font-mono text-slate-400">hanling-quest</span>、
          <span className="font-mono text-slate-400">hanling-event</span>
          。导入后页面数据即时生效并写回 localStorage。
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-imperial-gold/30 bg-slate-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-imperial-gold">
              确认魂穿复位？
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-slate-400">
                <p>
                  将用密函内容
                  <strong className="text-imperial-vermilion">覆盖</strong>
                  当前皇帝属性、征战目标、军机与邸报。此操作不可撤销（可先导出备份）。
                </p>
                <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-900/80 p-2 font-mono text-[10px] text-slate-300">
                  {stagedSummary}
                </pre>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 bg-slate-900 text-slate-200">
              留中不发
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "bg-imperial-vermilion hover:bg-imperial-vermilion/90"
              )}
              onClick={onConfirmImport}
            >
              确认魂穿
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
        <AlertDialogContent className="border-slate-800 bg-slate-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-imperial-vermilion">
              密函无法识读
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap text-slate-400">
              {errorMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-slate-800 text-slate-100">
              知道了
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
