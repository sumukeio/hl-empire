import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mobilePageMain, mobileStickyHeader, touchTarget } from "@/lib/mobile-ui";
import { cn } from "@/lib/utils";

export type MobileSubpageShellProps = {
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  mainClassName?: string;
  maxWidthClass?: string;
  headerClassName?: string;
};

export function MobileSubpageShell({
  backHref = "/dashboard",
  backLabel = "返回九州图志",
  title,
  subtitle,
  icon,
  headerExtra,
  children,
  mainClassName,
  maxWidthClass = "max-w-3xl",
  headerClassName,
}: MobileSubpageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background supports-[min-height:100dvh]:min-h-[100dvh]">
      <header
        className={cn(
          mobileStickyHeader,
          "border-border/80",
          headerClassName
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full items-center gap-3 px-4 py-3",
            maxWidthClass
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "shrink-0 text-imperial-gold hover:bg-imperial-gold/10",
              touchTarget
            )}
            asChild
          >
            <Link href={backHref} aria-label={backLabel}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-imperial-gold">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerExtra ? (
            <div className="flex shrink-0 items-center gap-2">
              {headerExtra}
            </div>
          ) : null}
        </div>
      </header>
      <main className={cn(mobilePageMain, maxWidthClass, mainClassName)}>
        {children}
      </main>
    </div>
  );
}
