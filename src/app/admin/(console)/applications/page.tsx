import { Suspense } from "react";
import Link from "next/link";
import { EyeIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApplicationStatusBadge } from "@/components/admin/applications/status-badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { SelectField, TextField } from "@/components/admin/fields";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination, pageParam, param, type SearchParams } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { EmptyRow, TableSkeleton } from "@/components/admin/status";
import { ReviewBadge } from "@/components/review/review-badge";
import { applicationStatusLabels, fmtDateTime, toOptions } from "@/lib/admin/labels";
import { reviewFilterOptions } from "@/lib/review";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { APPLICATION_PAGE_SIZE, listApplications } from "@/server/admin/applications";
import { deleteApplicationAction } from "@/server/admin/applications-actions";

// コンタクト申込一覧 (requests sent from My Page, BHALO200)
export default function ApplicationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="BHALO200"
        title="コンタクト申込一覧"
        titleEn="Contact requests"
        description="個人会員がマイページから申し込んだ企業・学校へのコンタクト依頼。"
      />
      <Suspense fallback={<TableSkeleton />}>
        <ApplicationsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ApplicationsList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff("view");
  const sp = await searchParams;
  const filters = {
    status: param(sp, "status"),
    member: param(sp, "member"),
    target: param(sp, "target"),
    review: param(sp, "review"),
    page: pageParam(sp),
  };
  const { rows, total, page, pageCount } = await listApplications(filters);
  const canDelete = hasPermission(staff, "delete");

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <SearchForm clearHref="/admin/applications">
        <SelectField name="status" label="ステータス" options={toOptions(applicationStatusLabels)} defaultValue={filters.status} placeholder="すべて" />
        <TextField name="member" label="会員（氏名・会員番号）" defaultValue={filters.member} />
        <TextField name="target" label="申込先（企業・学校名）" defaultValue={filters.target} />
        <SelectField name="review" label="審査" options={reviewFilterOptions} defaultValue={filters.review} allowEmpty={false} />
      </SearchForm>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">申込番号</TableHead>
              <TableHead>申込日時</TableHead>
              <TableHead>会員番号</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>申込先</TableHead>
              <TableHead>審査</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>最終更新</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={9} />}
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-right tabular-nums">{a.id}</TableCell>
                <TableCell>{fmtDateTime(a.createdAt)}</TableCell>
                <TableCell className="font-mono text-xs">
                  <Link href={`/admin/members/${a.individual.id}`} className="text-primary hover:underline">
                    {a.individual.memberNo}
                  </Link>
                </TableCell>
                <TableCell>{a.individual.fullName}</TableCell>
                <TableCell className="max-w-80 truncate whitespace-normal">
                  {a.items.map((i) => i.targetLabel).join("、")}
                  <span className="ml-1 text-xs text-muted-foreground">({a.items.length}件)</span>
                </TableCell>
                <TableCell>
                  <ReviewBadge status={a.reviewStatus} reason={a.rejectionReason} compact />
                </TableCell>
                <TableCell>
                  <ApplicationStatusBadge status={a.status} />
                </TableCell>
                <TableCell>{fmtDateTime(a.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/applications/${a.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <EyeIcon />
                      詳細
                    </Link>
                    {canDelete && (
                      <DeleteButton action={deleteApplicationAction} id={a.id} message="このコンタクト申込を削除します。よろしいですか？" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        pathname="/admin/applications"
        searchParams={sp}
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={APPLICATION_PAGE_SIZE}
      />
    </>
  );
}
