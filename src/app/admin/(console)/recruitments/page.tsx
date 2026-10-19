import { Suspense } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UrlCell } from "@/components/admin/corporations/corporation-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { SelectField, TextField } from "@/components/admin/fields";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination, pageParam, param, type SearchParams } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { EmptyRow, InactiveMark, TableSkeleton } from "@/components/admin/status";
import { activeFilterOptions, schoolCategoryOptions } from "@/lib/admin/labels";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { RECRUITMENT_PAGE_SIZE, listRecruitments } from "@/server/admin/recruitments";
import { deleteRecruitmentAction } from "@/server/admin/recruitments-actions";

// BHALO809 生徒募集状況一覧
export default function RecruitmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO809" title="生徒募集状況一覧" titleEn="Student recruitment">
        <Link href="/admin/recruitments/new" className={buttonVariants()}>
          <PlusIcon />
          生徒募集の追加
        </Link>
      </PageHeader>
      <Suspense fallback={<TableSkeleton />}>
        <RecruitmentsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RecruitmentsList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff("view");
  const sp = await searchParams;
  const filters = {
    school: param(sp, "school"),
    category: param(sp, "category"),
    faculty: param(sp, "faculty"),
    department: param(sp, "department"),
    location: param(sp, "location"),
    active: param(sp, "active"),
    page: pageParam(sp),
  };
  const { rows, total, page, pageCount } = await listRecruitments(filters);
  const canDelete = hasPermission(staff, "delete");

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <SearchForm clearHref="/admin/recruitments">
        <TextField name="school" label="学校名" defaultValue={filters.school} />
        <SelectField name="category" label="種別" options={schoolCategoryOptions} defaultValue={filters.category} placeholder="すべて" />
        <TextField name="faculty" label="学部" defaultValue={filters.faculty} />
        <TextField name="department" label="学科" defaultValue={filters.department} />
        <TextField name="location" label="所在地" defaultValue={filters.location} />
        <SelectField name="active" label="アクティブ" options={activeFilterOptions} defaultValue={filters.active} allowEmpty={false} />
      </SearchForm>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>法人会員番号</TableHead>
              <TableHead>学校名</TableHead>
              <TableHead>学部</TableHead>
              <TableHead>学科</TableHead>
              <TableHead>学校種別</TableHead>
              <TableHead>所在地</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-center">非アクティブ</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={9} />}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/admin/schools/${r.corporation.id}`} className="text-primary hover:underline">
                    {r.corporation.memberNo}
                  </Link>
                </TableCell>
                <TableCell>{r.corporation.name}</TableCell>
                <TableCell>{r.faculty}</TableCell>
                <TableCell>{r.department}</TableCell>
                <TableCell>{r.corporation.schoolCategory}</TableCell>
                <TableCell>{r.location}</TableCell>
                <TableCell>
                  <UrlCell url={r.corporation.url} />
                </TableCell>
                <TableCell className="text-center">
                  <InactiveMark active={r.isActive} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/recruitments/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <PencilIcon />
                      編集
                    </Link>
                    {canDelete && (
                      <DeleteButton
                        action={deleteRecruitmentAction}
                        id={r.id}
                        message="この生徒募集情報を削除します。よろしいですか？"
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination pathname="/admin/recruitments" searchParams={sp} page={page} pageCount={pageCount} total={total} pageSize={RECRUITMENT_PAGE_SIZE} />
    </>
  );
}
