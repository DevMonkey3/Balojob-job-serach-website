import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CorporationForm } from "@/components/admin/corporations/corporation-form";
import { SchoolRecruitmentsCard } from "@/components/admin/corporations/related-lists";
import { DeleteButton } from "@/components/admin/delete-button";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { fmtDate, fmtDateTime } from "@/lib/admin/labels";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { getCorporation, listCorporationRecruitments } from "@/server/admin/corporations";
import { deleteSchoolAction } from "@/server/admin/corporations-actions";
import { parseId } from "@/server/admin/form";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

// BHALO808 学校編集 + BHALO155 生徒募集情報一覧
export default function EditSchoolPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <EditSchool params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditSchool({ params, searchParams }: Props) {
  const staff = await requireStaff("edit");
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams]);
  const id = parseId(rawId);
  if (!id) notFound();

  const [school, recruitments] = await Promise.all([getCorporation("school", id), listCorporationRecruitments(id)]);
  if (!school) notFound();

  return (
    <>
      <PageHeader
        screenId="BHALO808"
        title="学校の編集"
        titleEn="Edit school"
        description={`${school.name} / 法人会員番号 ${school.memberNo} ・ 登録 ${fmtDate(school.createdAt)} ・ 最終更新 ${fmtDateTime(school.updatedAt)}`}
      >
        {hasPermission(staff, "delete") && (
          <DeleteButton
            action={deleteSchoolAction}
            id={school.id}
            redirectTo="/admin/schools"
            message="この学校情報を削除します。よろしいですか？"
            variant="outline"
            size="default"
          />
        )}
      </PageHeader>
      <Flash saved={param(sp, "saved")} />
      <CorporationForm kind="school" corporation={school} />
      <SchoolRecruitmentsCard memberNo={school.memberNo} recruitments={recruitments} />
    </>
  );
}
