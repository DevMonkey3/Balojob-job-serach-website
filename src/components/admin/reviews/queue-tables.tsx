import Link from "next/link";
import { EyeIcon, FileTextIcon, PencilIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReviewActions } from "@/components/admin/reviews/review-actions";
import { queueHref } from "@/components/admin/reviews/queue-tabs";
import { EmptyRow, Mark } from "@/components/admin/status";
import { ReviewBadge } from "@/components/review/review-badge";
import { fmtDateTime, fmtNumber } from "@/lib/admin/labels";
import type { PendingApplicationRow, PendingCandidateRow, PendingJobRow } from "@/server/admin/reviews";

// One table per review queue. Oldest submission first (the server orders them);
// after a decision the action sends staff back to the same tab.

const link = "text-primary hover:underline";
const actionLink = buttonVariants({ variant: "outline", size: "sm" });

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background">
      <Table>{children}</Table>
    </div>
  );
}

export function JobsQueue({ rows }: { rows: PendingJobRow[] }) {
  return (
    <Frame>
      <TableHeader>
        <TableRow>
          <TableHead>申請日時</TableHead>
          <TableHead>法人会員番号</TableHead>
          <TableHead>会社名</TableHead>
          <TableHead className="text-right">求人番号</TableHead>
          <TableHead>種別</TableHead>
          <TableHead>職種</TableHead>
          <TableHead>勤務地</TableHead>
          <TableHead className="text-right">給与</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <EmptyRow colSpan={9} />}
        {rows.map((j) => (
          <TableRow key={j.id}>
            <TableCell className="tabular-nums">{fmtDateTime(j.submittedAt)}</TableCell>
            <TableCell className="font-mono text-xs">
              <Link href={`/admin/companies/${j.corporationId}`} className={link}>
                {j.memberNo}
              </Link>
            </TableCell>
            <TableCell>{j.company}</TableCell>
            <TableCell className="text-right tabular-nums">{j.jobNo}</TableCell>
            <TableCell>
              <Badge variant="secondary">{j.category}</Badge>
            </TableCell>
            <TableCell>{j.jobType}</TableCell>
            <TableCell>{j.location}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNumber(j.monthlySalary)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Link href={`/admin/jobs/${j.id}`} className={actionLink}>
                  <PencilIcon />
                  編集
                </Link>
                <ReviewActions target="job" id={j.id} targetLabel="求人" redirectTo={queueHref("jobs")} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Frame>
  );
}

export function CandidatesQueue({ rows }: { rows: PendingCandidateRow[] }) {
  return (
    <Frame>
      <TableHeader>
        <TableRow>
          <TableHead>申請日時</TableHead>
          <TableHead>会員番号</TableHead>
          <TableHead>氏名</TableHead>
          <TableHead>国籍</TableHead>
          <TableHead>希望種別</TableHead>
          <TableHead className="text-center">履歴書ファイル</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <EmptyRow colSpan={7} />}
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="tabular-nums">{fmtDateTime(c.submittedAt)}</TableCell>
            <TableCell className="font-mono text-xs">{c.memberNo}</TableCell>
            <TableCell>
              <Link href={`/admin/reviews/candidates/${c.id}`} className={link}>
                {c.fullName}
              </Link>
            </TableCell>
            <TableCell>{c.nationality}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {c.goals.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <Mark on={c.hasResumeFile} label={c.hasResumeFile ? "履歴書ファイルあり" : "履歴書ファイルなし"} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Link href={`/admin/reviews/candidates/${c.id}`} className={actionLink}>
                  <FileTextIcon />
                  履歴書
                </Link>
                <Link href={`/admin/members/${c.id}`} className={actionLink}>
                  <PencilIcon />
                  編集
                </Link>
                <ReviewActions target="candidate" id={c.id} targetLabel="候補者プロフィール" redirectTo={queueHref("candidates")} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Frame>
  );
}

export function ApplicationsQueue({ rows }: { rows: PendingApplicationRow[] }) {
  return (
    <Frame>
      <TableHeader>
        <TableRow>
          <TableHead>応募日時</TableHead>
          <TableHead>氏名</TableHead>
          <TableHead>会員番号</TableHead>
          <TableHead>プロフィール審査</TableHead>
          <TableHead>求人</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <EmptyRow colSpan={6} />}
        {rows.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="tabular-nums">{fmtDateTime(a.submittedAt)}</TableCell>
            <TableCell>
              <Link href={`/admin/reviews/candidates/${a.individual.id}`} className={link}>
                {a.individual.fullName}
              </Link>
            </TableCell>
            <TableCell className="font-mono text-xs">{a.individual.memberNo}</TableCell>
            <TableCell>
              <ReviewBadge kind="candidate" status={a.individual.submitted ? a.individual.reviewStatus : "draft"} compact />
            </TableCell>
            <TableCell className="max-w-80 truncate whitespace-normal">
              {a.job ? (
                <Link href={`/admin/jobs/${a.job.id}`} className={link}>
                  {a.job.company} / {a.job.jobType} <span className="font-mono text-xs">#{a.job.jobNo}</span>
                </Link>
              ) : (
                <span className="text-muted-foreground">{a.targetLabel || "—"}</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Link href={`/admin/applications/${a.id}`} className={actionLink}>
                  <EyeIcon />
                  詳細
                </Link>
                <ReviewActions target="application" id={a.id} targetLabel="応募" redirectTo={queueHref("applications")} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Frame>
  );
}
