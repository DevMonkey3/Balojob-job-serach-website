import Link from "next/link";
import { EyeIcon, EyeOffIcon, PencilIcon, PlusIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReviewBadge } from "@/components/review/review-badge";
import { fmtNumber } from "@/lib/admin/labels";
import { jobTrackLabels } from "@/lib/format";
import type { MyJobRow } from "@/server/member/employer";
import { setMyJobActiveAction } from "@/server/member/employer-actions";

// BHALO115 求人情報一覧 as the employer sees it: their own jobs with the public
// status (審査中 / 掲載中 / 差戻し / 非公開) and how many applicants staff have
// approved. Server component: the 公開/非公開 toggle is a plain form.

export function JobsTable({ jobs }: { jobs: MyJobRow[] }) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-background px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">求人はまだ登録されていません。</p>
        <Link href="/employer/jobs/new" className={buttonVariants({ variant: "outline" })}>
          <PlusIcon />
          新規求人を登録する
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">求人番号</TableHead>
            <TableHead>種別</TableHead>
            <TableHead>業種</TableHead>
            <TableHead>職種</TableHead>
            <TableHead>勤務地</TableHead>
            <TableHead className="text-right">給与</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">承認済応募者</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((j) => (
            <TableRow key={j.id}>
              <TableCell className="text-right tabular-nums">
                <Link href={`/employer/jobs/${j.id}`} className="text-primary hover:underline">
                  {j.jobNo}
                </Link>
              </TableCell>
              <TableCell>{jobTrackLabels[j.track]}</TableCell>
              <TableCell>{j.industry}</TableCell>
              <TableCell>{j.jobType}</TableCell>
              <TableCell>{j.location}</TableCell>
              <TableCell className="text-right tabular-nums">
                {j.monthlySalary === null ? "" : `${fmtNumber(j.monthlySalary)}円`}
              </TableCell>
              <TableCell className="max-w-64 whitespace-normal">
                <ReviewBadge kind="job" status={j.reviewStatus} isActive={j.isActive} reason={j.rejectionReason} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Link href={`/employer/jobs/${j.id}#applicants`} className="text-primary hover:underline">
                  {j.approvedApplicants}名
                </Link>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Link href={`/employer/jobs/${j.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <PencilIcon />
                    編集
                  </Link>
                  <ActiveToggle id={j.id} isActive={j.isActive} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** 公開 / 非公開 without a new review (the review status is untouched). */
function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  return (
    <form action={setMyJobActiveAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={isActive ? "0" : "1"} />
      <Button type="submit" variant="ghost" size="sm">
        {isActive ? <EyeOffIcon /> : <EyeIcon />}
        {isActive ? "非公開にする" : "公開する"}
      </Button>
    </form>
  );
}
