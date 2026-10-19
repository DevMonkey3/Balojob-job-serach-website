import { Suspense } from "react";
import { Flash } from "@/components/admin/flash";
import { IndustriesEditor } from "@/components/admin/masters/industries-editor";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { requireStaff } from "@/server/auth/staff";
import { getIndustryRows } from "@/server/admin/masters";

// BHALO815 人気業種マスタメンテ
export default function IndustriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="BHALO815"
        title="人気業種マスタメンテ"
        titleEn="Popular industries"
        description="トップページの「人気の業種」に表示する業種。表示順の小さい順に並びます。"
      />
      <Suspense fallback={<TableSkeleton />}>
        <Industries searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Industries({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("admin");
  const [sp, rows] = await Promise.all([searchParams, getIndustryRows()]);

  return (
    <>
      <Flash saved={param(sp, "saved")} />
      <p className="text-xs text-muted-foreground">行の削除は[更新]を押したときに反映されます。</p>
      {/* Keyed so a save never leaves rows without their new ids on screen. */}
      <IndustriesEditor key={rows.map((r) => r.id).join(",")} rows={rows} />
    </>
  );
}
