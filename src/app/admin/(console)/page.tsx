import { Suspense } from "react";
import { Dashboard, DashboardSkeleton } from "@/components/admin/dashboard";
import { Flash } from "@/components/admin/flash";
import { param, type SearchParams } from "@/components/admin/pagination";
import { requireStaff } from "@/server/auth/staff";
import { getDashboard } from "@/server/dashboard";

// BHALO800 管理画面
export default function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardWithData searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardWithData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const data = await getDashboard();
  return (
    <div className="flex flex-col gap-4">
      <Flash saved={param(sp, "saved")} error={param(sp, "error")} />
      <Dashboard {...data} staffName={staff.name} />
    </div>
  );
}
