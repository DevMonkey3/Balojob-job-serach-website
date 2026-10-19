import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { RecruitmentForm } from "@/components/admin/recruitments/recruitment-form";
import { TableSkeleton } from "@/components/admin/status";
import { requireStaff } from "@/server/auth/staff";
import { getChildOptionLabels, getOptionLabels } from "@/server/admin/options";

// BHALO156 生徒募集情報の追加. `?memberNo=` pre-fills the school (from BHALO808).
export default function NewRecruitmentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO156" title="生徒募集の追加" titleEn="New student recruitment" />
      <Suspense fallback={<TableSkeleton />}>
        <NewRecruitmentForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewRecruitmentForm({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("edit");
  const [sp, faculties, departments, schoolGenders] = await Promise.all([
    searchParams,
    getOptionLabels("faculty"),
    getChildOptionLabels("faculty"),
    getOptionLabels("school_gender"),
  ]);
  return (
    <RecruitmentForm
      recruitment={null}
      options={{ faculties, departments, schoolGenders }}
      defaultMemberNo={param(sp, "memberNo")}
    />
  );
}
