import Link from "next/link";
import { Building2Icon, CalendarIcon, MapPinIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReviewBadge } from "@/components/review/review-badge";
import { applicationStatusForCandidate, type ReviewStatus } from "@/lib/review";

// 応募状況: the candidate's applications and where staff are with each.
// A list rather than a table, so it reads the same on a phone.

export type ApplicationView = {
  id: string;
  /** The job's page, when the job still exists. */
  jobId: string | null;
  /** Formatted on the server (YYYY/MM/DD). */
  appliedAt: string;
  company: string;
  jobType: string;
  category: string;
  location: string;
  /** Snapshot label when the job itself is gone. */
  targetLabel: string;
  reviewStatus: ReviewStatus;
  rejectionReason: string;
};

export function ApplicationsList({ rows }: { rows: ApplicationView[] }) {
  if (rows.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        応募はまだありません。気になる求人に応募すると、ここに状況が表示されます。
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {rows.map((a) => {
        const title = a.jobType || a.targetLabel || "求人";
        return (
          <li key={a.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {a.category && <Badge variant="outline">{a.category}</Badge>}
                {a.jobId ? (
                  <Link href={`/jobs/${a.jobId}`} prefetch={false} className="text-primary hover:underline">
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {a.company && (
                  <span className="flex items-center gap-1">
                    <Building2Icon className="size-3.5" aria-hidden />
                    {a.company}
                  </span>
                )}
                {a.location && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="size-3.5" aria-hidden />
                    {a.location}
                  </span>
                )}
                <span className="flex items-center gap-1 tabular-nums">
                  <CalendarIcon className="size-3.5" aria-hidden />
                  応募日 {a.appliedAt}
                </span>
              </p>
            </div>
            <div className="shrink-0">
              {a.reviewStatus === "approved" ? (
                <Badge>{applicationStatusForCandidate.approved}</Badge>
              ) : (
                <ReviewBadge kind="application" status={a.reviewStatus} reason={a.rejectionReason} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
