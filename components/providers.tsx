"use client";

import { EmpireCloudSync } from "@/components/empire-cloud-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EmpireCloudSync />
      {children}
    </>
  );
}
