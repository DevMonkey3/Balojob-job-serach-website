import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/status";
import { UserForm } from "@/components/admin/users/user-form";
import { PASSWORD_MIN_LENGTH } from "@/server/auth/password";
import { requireStaff } from "@/server/auth/staff";

// BHALO811 新規ユーザ追加
export default function NewUserPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO811" title="新規ユーザの追加" titleEn="New staff user" />
      <Suspense fallback={<TableSkeleton />}>
        <NewUserForm />
      </Suspense>
    </div>
  );
}

async function NewUserForm() {
  await requireStaff("admin");
  return <UserForm user={null} self={false} passwordMinLength={PASSWORD_MIN_LENGTH} />;
}
