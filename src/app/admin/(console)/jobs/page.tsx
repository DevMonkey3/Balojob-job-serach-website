import { Suspense } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { SelectField, TextField } from "@/components/admin/fields";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination, pageParam, param, type SearchParams } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { EmptyRow, InactiveMark, Mark, TableSkeleton } from "@/components/admin/status";
import { ReviewBadge } from "@/components/review/review-badge";
import { activeFilterOptions, fmtNumber, trackOptions } from "@/lib/admin/labels";
import { reviewFilterOptions } from "@/lib/review";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { JOB_PAGE_SIZE, listJobs } from "@/server/admin/jobs";
import { deleteJobAction } from "@/server/admin/jobs-actions";

// BHALO801 求人一覧
export default function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO801" title="求人一覧" titleEn="Job postings">
        <Link href="/admin/jobs/new" className={buttonVariants()}>
          <PlusIcon />
          新規求人の追加
        </Link>
      </PageHeader>
      <Suspense fallback={<TableSkeleton />}>
        <JobsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function JobsList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff("view");
  const sp = await searchParams;
  const filters = {
    company: param(sp, "company"),
    industry: param(sp, "industry"),
    jobType: param(sp, "jobType"),
    location: param(sp, "location"),
    track: param(sp, "track"),
    active: param(sp, "active"),
    review: param(sp, "review"),
    page: pageParam(sp),
  };
  const { rows, total, page, pageCount } = await listJobs(filters);
  const canDelete = hasPermission(staff, "delete");

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <SearchForm clearHref="/admin/jobs">
        <TextField name="company" label="会社名" defaultValue={filters.company} />
        <TextField name="industry" label="業種" defaultValue={filters.industry} />
        <TextField name="jobType" label="職種" defaultValue={filters.jobType} />
        <TextField name="location" label="勤務地" defaultValue={filters.location} />
        <SelectField name="track" label="種別" options={trackOptions} defaultValue={filters.track} placeholder="すべて" />
        <SelectField name="active" label="アクティブ" options={activeFilterOptions} defaultValue={filters.active} allowEmpty={false} />
        <SelectField name="review" label="審査" options={reviewFilterOptions} defaultValue={filters.review} allowEmpty={false} />
      </SearchForm>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>法人会員番号</TableHead>
              <TableHead>会社名</TableHead>
              <TableHead className="text-right">求人番号</TableHead>
              <TableHead>業種</TableHead>
              <TableHead>職種</TableHead>
              <TableHead>勤務地</TableHead>
              <TableHead className="text-right">給与</TableHead>
              <TableHead className="text-center">技人国</TableHead>
              <TableHead className="text-center">特定技能</TableHead>
              <TableHead className="text-center">技能実習</TableHead>
              <TableHead className="text-center">非アクティブ</TableHead>
              <TableHead>審査</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={13} />}
            {rows.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/admin/companies/${j.corporation.id}`} className="text-primary hover:underline">
                    {j.corporation.memberNo}
                  </Link>
                </TableCell>
                <TableCell>{j.corporation.name}</TableCell>
                <TableCell className="text-right tabular-nums">{j.jobNo}</TableCell>
                <TableCell>{j.industry}</TableCell>
                <TableCell>{j.jobType}</TableCell>
                <TableCell>{j.location}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(j.monthlySalary)}</TableCell>
                <TableCell className="text-center"><Mark on={j.track === "engineer"} /></TableCell>
                <TableCell className="text-center"><Mark on={j.track === "ssw"} /></TableCell>
                <TableCell className="text-center"><Mark on={j.track === "titp"} /></TableCell>
                <TableCell className="text-center"><InactiveMark active={j.isActive} /></TableCell>
                <TableCell>
                  <ReviewBadge status={j.reviewStatus} reason={j.rejectionReason} compact />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/jobs/${j.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <PencilIcon />
                      編集
                    </Link>
                    {canDelete && (
                      <DeleteButton action={deleteJobAction} id={j.id} message="この求人情報を削除します。よろしいですか？" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination pathname="/admin/jobs" searchParams={sp} page={page} pageCount={pageCount} total={total} pageSize={JOB_PAGE_SIZE} />
    </>
  );
}
