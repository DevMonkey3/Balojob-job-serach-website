import { Badge } from "@/components/ui/badge";
import {
  candidateStatusLabels,
  candidateStatusVariants,
  jobPublicStatus,
  reviewBadgeVariants,
  reviewStatusLabels,
  type CandidateStatus,
  type ReviewStatus,
} from "@/lib/review";

type Props = {
  status: ReviewStatus | CandidateStatus;
  /** Shown under the badge for 差戻し. */
  reason?: string | null;
  /** "job" uses 掲載中 / 非公開 wording (needs isActive); "candidate" knows 未提出. */
  kind?: "job" | "candidate" | "application";
  isActive?: boolean;
  /** Table cells: no reason line, the reason goes into the title attribute. */
  compact?: boolean;
};

/** 審査 status as a badge, with the rejection reason where there is room. */
export function ReviewBadge({ status, reason, kind = "application", isActive = true, compact = false }: Props) {
  let label: string;
  let variant: "default" | "secondary" | "destructive" | "outline";
  if (kind === "job" && status !== "draft") {
    ({ label, variant } = jobPublicStatus({ reviewStatus: status, isActive }));
  } else if (kind === "candidate") {
    label = candidateStatusLabels[status];
    variant = candidateStatusVariants[status];
  } else {
    const s = status === "draft" ? "pending" : status;
    label = reviewStatusLabels[s];
    variant = reviewBadgeVariants[s];
  }
  const showReason = status === "rejected" && !!reason;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Badge variant={variant} title={compact && showReason ? `差戻し理由：${reason}` : undefined}>
        {label}
      </Badge>
      {showReason && !compact && <span className="text-xs text-muted-foreground">差戻し理由：{reason}</span>}
    </span>
  );
}
