import { Suspense } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { SelectField, TextField } from "@/components/admin/fields";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination, pageParam, param, type SearchParams } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { EmptyRow, InactiveMark, TableSkeleton } from "@/components/admin/status";
import { ReviewBadge } from "@/components/review/review-badge";
import { activeFilterOptions, fmtDate } from "@/lib/admin/labels";
import { candidateFilterOptions } from "@/lib/review";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { MEMBER_PAGE_SIZE, goalFilterOptions, listMembers } from "@/server/admin/members";
import { deleteMemberAction } from "@/server/admin/members-actions";
import { getOptionLabels } from "@/server/admin/options";

// BHALO805 個人会員一覧
export default function MembersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO805" title="個人会員一覧" titleEn="Individual members">
        <Link href="/admin/members/new" className={buttonVariants()}>
          <PlusIcon />
          新規個人会員の追加
        </Link>
      </PageHeader>
      <Suspense fallback={<TableSkeleton />}>
        <MembersList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MembersList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff("view");
  const sp = await searchParams;
  const filters = {
    name: param(sp, "name"),
    gender: param(sp, "gender"),
    nationality: param(sp, "nationality"),
    goal: param(sp, "goal"),
    active: param(sp, "active"),
    review: param(sp, "review"),
    page: pageParam(sp),
  };
  const [{ rows, total, page, pageCount }, genders, countries] = await Promise.all([
    listMembers(filters),
    getOptionLabels("gender"),
    getOptionLabels("country"),
  ]);
  const canDelete = hasPermission(staff, "delete");

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <SearchForm clearHref="/admin/members">
        <TextField name="name" label="氏名" defaultValue={filters.name} hint="氏名・フリガナの部分一致" />
        <SelectField name="gender" label="性別" options={genders} defaultValue={filters.gender} placeholder="すべて" />
        <SelectField name="nationality" label="国籍" options={countries} defaultValue={filters.nationality} placeholder="すべて" />
        <SelectField name="goal" label="求職/就学" options={goalFilterOptions} defaultValue={filters.goal} allowEmpty={false} />
        <SelectField name="active" label="アクティブ" options={activeFilterOptions} defaultValue={filters.active} allowEmpty={false} />
        <SelectField name="review" label="審査" options={candidateFilterOptions} defaultValue={filters.review} allowEmpty={false} />
      </SearchForm>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会員番号</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>性別</TableHead>
              <TableHead>生年月日</TableHead>
              <TableHead>国籍</TableHead>
              <TableHead>求職/就学</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead className="text-center">非アクティブ</TableHead>
              <TableHead>審査</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={10} />}
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/admin/members/${m.id}`} className="text-primary hover:underline">
                    {m.memberNo}
                  </Link>
                </TableCell>
                <TableCell>{m.fullName}</TableCell>
                <TableCell>{m.gender}</TableCell>
                <TableCell className="tabular-nums">{fmtDate(m.birthDate)}</TableCell>
                <TableCell>{m.nationality}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {m.wantsJob && <Badge variant="secondary">求職</Badge>}
                    {m.wantsStudy && <Badge variant="outline">就学</Badge>}
                  </div>
                </TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell className="text-center"><InactiveMark active={m.isActive} /></TableCell>
                <TableCell>
                  <ReviewBadge kind="candidate" status={m.submitted ? m.reviewStatus : "draft"} reason={m.rejectionReason} compact />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/members/${m.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <PencilIcon />
                      編集
                    </Link>
                    {canDelete && (
                      <DeleteButton action={deleteMemberAction} id={m.id} message="この個人会員情報を削除します。よろしいですか？" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination pathname="/admin/members" searchParams={sp} page={page} pageCount={pageCount} total={total} pageSize={MEMBER_PAGE_SIZE} />
    </>
  );
}
