import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CorporationForm } from "@/components/admin/corporations/corporation-form";
import { CompanyJobsCard } from "@/components/admin/corporations/related-lists";
import { DeleteButton } from "@/components/admin/delete-button";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { fmtDate, fmtDateTime } from "@/lib/admin/labels";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { getCorporation, listCorporationJobs } from "@/server/admin/corporations";
import { deleteCompanyAction } from "@/server/admin/corporations-actions";
import { parseId } from "@/server/admin/form";
import { getOptionLabels } from "@/server/admin/options";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

// BHALO804 企業編集 + BHALO115 求人情報一覧
export default function EditCompanyPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <EditCompany params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditCompany({ params, searchParams }: Props) {
  const staff = await requireStaff("edit");
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams]);
  const id = parseId(rawId);
  if (!id) notFound();

  const [company, industries, jobs] = await Promise.all([
    getCorporation("company", id),
    getOptionLabels("industry"),
    listCorporationJobs(id),
  ]);
  if (!company) notFound();

  return (
    <>
      <PageHeader
        screenId="BHALO804"
        title="企業の編集"
        titleEn="Edit company"
        description={`${company.name} / 法人会員番号 ${company.memberNo} ・ 登録 ${fmtDate(company.createdAt)} ・ 最終更新 ${fmtDateTime(company.updatedAt)}`}
      >
        {hasPermission(staff, "delete") && (
          <DeleteButton
            action={deleteCompanyAction}
            id={company.id}
            redirectTo="/admin/companies"
            message="この企業情報を削除します。よろしいですか？"
            variant="outline"
            size="default"
          />
        )}
      </PageHeader>
      <Flash saved={param(sp, "saved")} />
      <CorporationForm kind="company" corporation={company} options={{ industries }} />
      <CompanyJobsCard memberNo={company.memberNo} jobs={jobs} />
    </>
  );
}
