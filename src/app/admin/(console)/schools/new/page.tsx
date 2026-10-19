import { Suspense } from "react";
import { CorporationForm } from "@/components/admin/corporations/corporation-form";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/status";
import { requireStaff } from "@/server/auth/staff";

// BHALO808 新規学校追加
export default function NewSchoolPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO808" title="新規学校の追加" titleEn="New school" />
      <Suspense fallback={<TableSkeleton />}>
        <NewSchoolForm />
      </Suspense>
    </div>
  );
}

async function NewSchoolForm() {
  await requireStaff("edit");
  return <CorporationForm kind="school" corporation={null} />;
}
