import { Suspense } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CorporationTable } from "@/components/admin/corporations/corporation-table";
import { SelectField, TextField } from "@/components/admin/fields";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination, pageParam, param, type SearchParams } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { TableSkeleton } from "@/components/admin/status";
import { activeFilterOptions } from "@/lib/admin/labels";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { CORPORATION_PAGE_SIZE, listCorporations } from "@/server/admin/corporations";

// BHALO803 企業一覧
export default function CompaniesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO803" title="企業一覧" titleEn="Companies">
        <Link href="/admin/companies/new" className={buttonVariants()}>
          <PlusIcon />
          新規企業の追加
        </Link>
      </PageHeader>
      <Suspense fallback={<TableSkeleton />}>
        <CompaniesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CompaniesList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff("view");
  const sp = await searchParams;
  const filters = {
    name: param(sp, "name"),
    industry: param(sp, "industry"),
    location: param(sp, "location"),
    active: param(sp, "active"),
    page: pageParam(sp),
  };
  const { rows, total, page, pageCount } = await listCorporations("company", filters);

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <SearchForm clearHref="/admin/companies">
        <TextField name="name" label="会社名" defaultValue={filters.name} />
        <TextField name="industry" label="業種" defaultValue={filters.industry} />
        <TextField name="location" label="所在地" defaultValue={filters.location} />
        <SelectField name="active" label="アクティブ" options={activeFilterOptions} defaultValue={filters.active} allowEmpty={false} />
      </SearchForm>

      <CorporationTable kind="company" rows={rows} canDelete={hasPermission(staff, "delete")} />

      <Pagination pathname="/admin/companies" searchParams={sp} page={page} pageCount={pageCount} total={total} pageSize={CORPORATION_PAGE_SIZE} />
    </>
  );
}
