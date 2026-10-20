import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { Flash } from "@/components/admin/flash";
import { JobForm } from "@/components/admin/jobs/job-form";
import { JobOrderForm } from "@/components/admin/jobs/job-order-form";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { ReviewActions } from "@/components/admin/reviews/review-actions";
import { TableSkeleton } from "@/components/admin/status";
import { ReviewBadge } from "@/components/review/review-badge";
import { fmtDateTime } from "@/lib/admin/labels";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { parseId } from "@/server/admin/form";
import { getJob } from "@/server/admin/jobs";
import { deleteJobAction } from "@/server/admin/jobs-actions";
import { getChildOptionLabels, getOptionLabels } from "@/server/admin/options";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

// BHALO802 求人編集 + BHALO117 求人票
export default function EditJobPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <EditJob params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditJob({ params, searchParams }: Props) {
  const staff = await requireStaff("edit");
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams]);
  const id = parseId(rawId);
  if (!id) notFound();

  const [job, industries, jobTypes] = await Promise.all([
    getJob(id),
    getOptionLabels("industry"),
    getChildOptionLabels("industry"),
  ]);
  if (!job) notFound();
  const canReview = job.reviewStatus === "pending" && hasPermission(staff, "edit");

  return (
    <>
      <PageHeader
        screenId="BHALO802"
        title="求人の編集"
        titleEn="Edit job posting"
        description={[
          `${job.companyName} / 求人番号 ${job.jobNo} ・ 最終更新 ${fmtDateTime(job.updatedAt)}`,
          job.submittedAt && `申請日時 ${fmtDateTime(job.submittedAt)}`,
          job.reviewedAt && `審査日時 ${fmtDateTime(job.reviewedAt)}`,
        ]
          .filter(Boolean)
          .join(" ・ ")}
      >
        <ReviewBadge status={job.reviewStatus} reason={job.rejectionReason} />
        {canReview && <ReviewActions target="job" id={job.id} targetLabel="求人" redirectTo={`/admin/jobs/${job.id}`} size="default" />}
        {hasPermission(staff, "delete") && (
          <DeleteButton
            action={deleteJobAction}
            id={job.id}
            redirectTo="/admin/jobs"
            message="この求人情報を削除します。よろしいですか？"
            variant="outline"
            size="default"
          />
        )}
      </PageHeader>
      <Flash saved={param(sp, "saved")} />
      <JobForm job={job} options={{ industries, jobTypes }} />
      <div id="job-order">
        <JobOrderForm jobId={job.id} order={job.jobOrder} />
      </div>
    </>
  );
}
