import { Suspense } from "react";
import { JobForm } from "@/components/admin/jobs/job-form";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { requireStaff } from "@/server/auth/staff";
import { getChildOptionLabels, getOptionLabels } from "@/server/admin/options";

// BHALO802 新規求人追加. `?memberNo=` prefills the company (link from BHALO804).
export default function NewJobPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO802" title="新規求人の追加" titleEn="New job posting" />
      <Suspense fallback={<TableSkeleton />}>
        <NewJobForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewJobForm({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("edit");
  const [sp, industries, jobTypes] = await Promise.all([
    searchParams,
    getOptionLabels("industry"),
    getChildOptionLabels("industry"),
  ]);
  return <JobForm job={null} options={{ industries, jobTypes }} defaultMemberNo={param(sp, "memberNo")} />;
}
