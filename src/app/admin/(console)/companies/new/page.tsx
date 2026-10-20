import { Suspense } from "react";
import { CorporationForm } from "@/components/admin/corporations/corporation-form";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/status";
import { requireStaff } from "@/server/auth/staff";
import { getOptionLabels } from "@/server/admin/options";

// BHALO804 新規企業追加
export default function NewCompanyPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO804" title="新規企業の追加" titleEn="New company" />
      <Suspense fallback={<TableSkeleton />}>
        <NewCompanyForm />
      </Suspense>
    </div>
  );
}

async function NewCompanyForm() {
  await requireStaff("edit");
  const industries = await getOptionLabels("industry");
  return <CorporationForm kind="company" corporation={null} options={{ industries }} />;
}
