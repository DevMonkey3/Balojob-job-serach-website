import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/status";
import { UserForm } from "@/components/admin/users/user-form";
import { fmtDateTime } from "@/lib/admin/labels";
import { PASSWORD_MIN_LENGTH } from "@/server/auth/password";
import { requireStaff } from "@/server/auth/staff";
import { getStaffUser, parseUuid } from "@/server/admin/staff-users";
import { deleteStaffUserAction } from "@/server/admin/staff-users-actions";

type Props = { params: Promise<{ id: string }> };

// BHALO811 ユーザ編集
export default function EditUserPage({ params }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <EditUser params={params} />
      </Suspense>
    </div>
  );
}

async function EditUser({ params }: Props) {
  const staff = await requireStaff("admin");
  const id = parseUuid((await params).id);
  if (!id) notFound();

  const user = await getStaffUser(id);
  if (!user) notFound();
  const self = user.id === staff.id;

  return (
    <>
      <PageHeader
        screenId="BHALO811"
        title="ユーザの編集"
        titleEn="Edit staff user"
        description={`${user.email} ・ 最終ログイン ${fmtDateTime(user.lastLoginAt) || "なし"} ・ 最終更新 ${fmtDateTime(user.updatedAt)}`}
      >
        {!self && (
          <DeleteButton
            action={deleteStaffUserAction}
            id={user.id}
            redirectTo="/admin/users"
            message="このユーザを削除します。よろしいですか？"
            variant="outline"
            size="default"
          />
        )}
      </PageHeader>
      <UserForm user={user} self={self} passwordMinLength={PASSWORD_MIN_LENGTH} />
    </>
  );
}
