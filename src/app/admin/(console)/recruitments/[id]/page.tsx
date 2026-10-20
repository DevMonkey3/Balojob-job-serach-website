import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { RecruitmentForm } from "@/components/admin/recruitments/recruitment-form";
import { TableSkeleton } from "@/components/admin/status";
import { fmtDateTime } from "@/lib/admin/labels";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { parseId } from "@/server/admin/form";
import { getChildOptionLabels, getOptionLabels } from "@/server/admin/options";
import { getRecruitment } from "@/server/admin/recruitments";
import { deleteRecruitmentAction } from "@/server/admin/recruitments-actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

// BHALO156 生徒募集情報の編集
export default function EditRecruitmentPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <EditRecruitment params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditRecruitment({ params, searchParams }: Props) {
  const staff = await requireStaff("edit");
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams]);
  const id = parseId(rawId);
  if (!id) notFound();

  const [recruitment, faculties, departments, schoolGenders] = await Promise.all([
    getRecruitment(id),
    getOptionLabels("faculty"),
    getChildOptionLabels("faculty"),
    getOptionLabels("school_gender"),
  ]);
  if (!recruitment) notFound();

  return (
    <>
      <PageHeader
        screenId="BHALO156"
        title="生徒募集の編集"
        titleEn="Edit student recruitment"
        description={`${recruitment.schoolName} / 募集番号 ${recruitment.recruitmentNo} ・ 最終更新 ${fmtDateTime(recruitment.updatedAt)}`}
      >
        {hasPermission(staff, "delete") && (
          <DeleteButton
            action={deleteRecruitmentAction}
            id={recruitment.id}
            redirectTo="/admin/recruitments"
            message="この生徒募集情報を削除します。よろしいですか？"
            variant="outline"
            size="default"
          />
        )}
      </PageHeader>
      <Flash saved={param(sp, "saved")} />
      <RecruitmentForm recruitment={recruitment} options={{ faculties, departments, schoolGenders }} />
    </>
  );
}
