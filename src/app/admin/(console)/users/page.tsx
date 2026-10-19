import { Suspense } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { EmptyRow, InactiveMark, TableSkeleton } from "@/components/admin/status";
import { fmtDateTime } from "@/lib/admin/labels";
import { requireStaff } from "@/server/auth/staff";
import { listStaffUsers } from "@/server/admin/staff-users";
import { deleteStaffUserAction } from "@/server/admin/staff-users-actions";

// BHALO810 ユーザ一覧
export default function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="BHALO810"
        title="ユーザ一覧"
        titleEn="Staff users"
        description="管理画面にログインできるスタッフ。Administratorだけが操作できます。"
      >
        <Link href="/admin/users/new" className={buttonVariants()}>
          <PlusIcon />
          新規ユーザの追加
        </Link>
      </PageHeader>
      <Suspense fallback={<TableSkeleton />}>
        <UsersList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function UsersList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff("admin");
  const sp = await searchParams;
  const rows = await listStaffUsers();

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ユーザ名</TableHead>
              <TableHead>ログインID</TableHead>
              <TableHead className="text-center">Administrator</TableHead>
              <TableHead className="text-center">参照権限</TableHead>
              <TableHead className="text-center">更新権限</TableHead>
              <TableHead className="text-center">削除権限</TableHead>
              <TableHead className="text-center">非アクティブ</TableHead>
              <TableHead>最終ログイン</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={9} />}
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {u.name}
                  {u.id === staff.id && (
                    <Badge variant="outline" className="ml-2">
                      自分
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell className="text-center font-semibold">{u.isAdmin && "YES"}</TableCell>
                <TableCell className="text-center">{u.canView && "有り"}</TableCell>
                <TableCell className="text-center">{u.canEdit && "有り"}</TableCell>
                <TableCell className="text-center">{u.canDelete && "有り"}</TableCell>
                <TableCell className="text-center"><InactiveMark active={u.isActive} /></TableCell>
                <TableCell className="tabular-nums">{fmtDateTime(u.lastLoginAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/users/${u.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <PencilIcon />
                      編集
                    </Link>
                    {u.id !== staff.id && (
                      <DeleteButton action={deleteStaffUserAction} id={u.id} message="このユーザを削除します。よろしいですか？" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
