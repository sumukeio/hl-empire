import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

type CampaignClusterIconProps = {
  className?: string;
  title?: string;
};

/** 集团军 · 战役集群：闪电爆发（Lucide `Zap`） */
export function CampaignClusterIcon({
  className,
  title,
}: CampaignClusterIconProps) {
  return (
    <Zap
      className={cn("h-4 w-4 shrink-0", className)}
      strokeWidth={2.25}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    />
  );
}
