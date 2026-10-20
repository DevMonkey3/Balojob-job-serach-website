import { Suspense } from "react";
import type { Metadata } from "next";
import { JobForm } from "@/components/admin/jobs/job-form";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/status";
import { requireEmployer } from "@/server/auth/member";
import { getChildOptionLabels, getOptionLabels } from "@/server/admin/options";
import { saveMyJobAction } from "@/server/member/employer-actions";

export const metadata: Metadata = { title: "新規求人の登録", robots: { index: false } };

// BHALO116 求人情報登録: a new posting for the signed-in company; it waits for staff review.
export default function NewEmployerJobPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="BHALO116"
        title="新規求人の登録"
        titleEn="New job posting"
        description="登録した求人はスタッフの審査後にサイトへ掲載されます。"
      />
      <Suspense fallback={<TableSkeleton />}>
        <NewJobForm />
      </Suspense>
    </div>
  );
}

async function NewJobForm() {
  await requireEmployer("/employer/jobs/new");
  const [industries, jobTypes] = await Promise.all([getOptionLabels("industry"), getChildOptionLabels("industry")]);
  return (
    <JobForm
      job={null}
      options={{ industries, jobTypes }}
      variant="employer"
      action={saveMyJobAction}
      cancelHref="/employer/jobs"
    />
  );
}
