import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/status";
import { JobsTable } from "@/components/employer/jobs-table";
import { requireEmployer } from "@/server/auth/member";
import { listMyJobs } from "@/server/member/employer";

export const metadata: Metadata = { title: "求人一覧", robots: { index: false } };

// BHALO115 求人情報一覧: the company's own postings and their review status.
export default function EmployerJobsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO115" title="求人一覧" titleEn="Your job postings">
        <Link href="/employer/jobs/new" className={buttonVariants()}>
          <PlusIcon />
          新規求人を登録する
        </Link>
      </PageHeader>
      <Suspense fallback={<TableSkeleton />}>
        <JobsList />
      </Suspense>
      <StatusNote />
    </div>
  );
}

async function JobsList() {
  const m = await requireEmployer("/employer/jobs");
  const jobs = await listMyJobs(BigInt(m.corporationId));
  return <JobsTable jobs={jobs} />;
}

function StatusNote() {
  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">ステータスについて</p>
      <dl className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
        <dt className="font-medium">審査中</dt>
        <dd>スタッフが内容を確認しています。承認されるとサイトに掲載されます。</dd>
        <dt className="font-medium">掲載中</dt>
        <dd>承認済みで、サイトに公開されています。内容を変更すると再び審査中になります。</dd>
        <dt className="font-medium">差戻し</dt>
        <dd>修正が必要です。理由を確認のうえ編集し、再度審査に出してください。</dd>
        <dt className="font-medium">非公開</dt>
        <dd>「非公開にする」で検索結果から外しています。「公開する」で元に戻ります（審査状況はそのまま）。</dd>
      </dl>
    </div>
  );
}
