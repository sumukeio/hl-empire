"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** SSR / 首帧：按移动优先视为非 lg，避免大屏误用 Drawer */
function getServerSnapshot() {
  return false;
}

/** 是否 ≥ Tailwind `lg`（1024px），用于军机处选城 Select / Drawer 切换 */
export function useIsLgScreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
