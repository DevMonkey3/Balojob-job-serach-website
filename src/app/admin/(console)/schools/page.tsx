import { Suspense } from "react";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AdminLink } from "@/components/admin/admin-path";
import { CorporationTable } from "@/components/admin/corporations/corporation-table";
import { SelectField, TextField } from "@/components/admin/fields";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination, pageParam, param, type SearchParams } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { TableSkeleton } from "@/components/admin/status";
import { activeFilterOptions, schoolCategoryOptions } from "@/lib/admin/labels";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { CORPORATION_PAGE_SIZE, listCorporations } from "@/server/admin/corporations";

// BHALO807 学校一覧
export default function SchoolsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="学校一覧" titleEn="Schools">
        <AdminLink href="/schools/new" className={buttonVariants()}>
          <PlusIcon />
          新規学校の追加
        </AdminLink>
      </PageHeader>
      <Suspense fallback={<TableSkeleton />}>
        <SchoolsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SchoolsList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff("view");
  const sp = await searchParams;
  const filters = {
    name: param(sp, "name"),
    category: param(sp, "category"),
    location: param(sp, "location"),
    active: param(sp, "active"),
    page: pageParam(sp),
  };
  const { rows, total, page, pageCount } = await listCorporations("school", filters);

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <SearchForm clearHref="/schools">
        <TextField name="name" label="学校名" defaultValue={filters.name} />
        <SelectField name="category" label="学校種別" options={schoolCategoryOptions} defaultValue={filters.category} placeholder="すべて" />
        <TextField name="location" label="所在地" defaultValue={filters.location} />
        <SelectField name="active" label="アクティブ" options={activeFilterOptions} defaultValue={filters.active} allowEmpty={false} />
      </SearchForm>

      <CorporationTable kind="school" rows={rows} canDelete={hasPermission(staff, "delete")} />

      <Pagination pathname="/schools" searchParams={sp} page={page} pageCount={pageCount} total={total} pageSize={CORPORATION_PAGE_SIZE} />
    </>
  );
}
