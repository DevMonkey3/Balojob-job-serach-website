import { Suspense } from "react";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { ApplicationsQueue, CandidatesQueue, JobsQueue } from "@/components/admin/reviews/queue-tables";
import { QueueTabs, isQueueTab, type QueueTab } from "@/components/admin/reviews/queue-tabs";
import { TableSkeleton } from "@/components/admin/status";
import { requireStaff } from "@/server/auth/staff";
import { getPendingCounts, listPendingApplications, listPendingCandidates, listPendingJobs } from "@/server/admin/reviews";

// 審査待ち一覧: what members submitted and staff have not decided on yet.
// Approving publishes a job / introduces a candidate; rejecting sends it back
// with a reason the member sees.
export default function ReviewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="MVP"
        title="審査待ち一覧"
        titleEn="Review queue"
        description="承認すると公開・紹介されます。差戻しは理由が申請者に表示されます。"
      />
      <Suspense fallback={<TableSkeleton />}>
        <ReviewQueues searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function queueTable(tab: QueueTab): Promise<React.ReactNode> {
  switch (tab) {
    case "jobs":
      return <JobsQueue rows={await listPendingJobs()} />;
    case "candidates":
      return <CandidatesQueue rows={await listPendingCandidates()} />;
    case "applications":
      return <ApplicationsQueue rows={await listPendingApplications()} />;
  }
}

async function ReviewQueues({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("edit");
  const sp = await searchParams;
  const requested = param(sp, "tab");
  const tab: QueueTab = isQueueTab(requested) ? requested : "jobs";
  const [counts, table] = await Promise.all([getPendingCounts(), queueTable(tab)]);

  return (
    <>
      <Flash saved={param(sp, "saved")} />
      <QueueTabs active={tab} counts={counts} />
      {table}
    </>
  );
}
