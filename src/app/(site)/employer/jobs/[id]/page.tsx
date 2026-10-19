import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flash } from "@/components/admin/flash";
import { JobForm } from "@/components/admin/jobs/job-form";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { ApplicantsCard } from "@/components/employer/applicants-card";
import { ReviewBadge } from "@/components/review/review-badge";
import { fmtDateTime } from "@/lib/admin/labels";
import { requireEmployer } from "@/server/auth/member";
import { parseId } from "@/server/admin/form";
import { getChildOptionLabels, getOptionLabels } from "@/server/admin/options";
import { getMyJob, listApprovedApplicants } from "@/server/member/employer";
import { saveMyJobAction } from "@/server/member/employer-actions";

export const metadata: Metadata = { title: "求人の編集", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

// BHALO116 求人情報編集 + the approved applicants of that job (BHALO200).
export default function EmployerJobPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <EditJob params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditJob({ params, searchParams }: Props) {
  const { id: rawId } = await params;
  const m = await requireEmployer(`/employer/jobs/${rawId}`);
  const id = parseId(rawId);
  if (!id) notFound();
  const corporationId = BigInt(m.corporationId);

  const [sp, job, applicants, industries, jobTypes] = await Promise.all([
    searchParams,
    getMyJob(corporationId, id),
    listApprovedApplicants(corporationId, id),
    getOptionLabels("industry"),
    getChildOptionLabels("industry"),
  ]);
  if (!job) notFound();

  const meta = [
    `求人番号 ${job.jobNo}`,
    job.jobType,
    job.submittedAt && `審査申請 ${fmtDateTime(job.submittedAt)}`,
    `最終更新 ${fmtDateTime(job.updatedAt)}`,
  ].filter(Boolean);

  return (
    <>
      <PageHeader screenId="BHALO116" title="求人の編集" titleEn="Edit job posting" description={meta.join(" ・ ")}>
        <ReviewBadge kind="job" status={job.reviewStatus} isActive={job.isActive} reason={job.rejectionReason} />
      </PageHeader>
      <Flash saved={param(sp, "saved")} />
      <JobForm
        job={job}
        options={{ industries, jobTypes }}
        variant="employer"
        action={saveMyJobAction}
        cancelHref="/employer/jobs"
      />
      <section id="applicants" className="scroll-mt-24">
        <ApplicantsCard applicants={applicants} />
      </section>
    </>
  );
}
