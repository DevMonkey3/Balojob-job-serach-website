import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReviewBadge } from "@/components/review/review-badge";
import { applicationStatusForCandidate, type ReviewStatus } from "@/lib/review";

// BHALO200 応募状況: the candidate's applications and where staff are with each.

export type ApplicationView = {
  id: string;
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
    return <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">応募はまだありません。</p>;
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>応募日</TableHead>
            <TableHead>会社名</TableHead>
            <TableHead>職種</TableHead>
            <TableHead>勤務地</TableHead>
            <TableHead>ステータス</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs">{a.appliedAt}</TableCell>
              <TableCell>{a.company || a.targetLabel || "—"}</TableCell>
              <TableCell>
                {a.category && (
                  <Badge variant="outline" className="mr-2">
                    {a.category}
                  </Badge>
                )}
                {a.jobType || "—"}
              </TableCell>
              <TableCell>{a.location || "—"}</TableCell>
              <TableCell className="whitespace-normal">
                {a.reviewStatus === "approved" ? (
                  <Badge>{applicationStatusForCandidate.approved}</Badge>
                ) : (
                  <ReviewBadge kind="application" status={a.reviewStatus} reason={a.rejectionReason} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
