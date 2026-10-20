import { Suspense } from "react";
import { UserCheckIcon, UserXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { SelectField, TextField } from "@/components/admin/fields";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination, pageParam, param, type SearchParams } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { EmptyRow, InactiveMark, Mark, TableSkeleton } from "@/components/admin/status";
import { accountTypeLabels, fmtDate, fmtDateTime, toOptions } from "@/lib/admin/labels";
import { requireStaff } from "@/server/auth/staff";
import { LOGIN_PAGE_SIZE, listLogins } from "@/server/admin/masters";
import { deleteLoginAction, toggleUserActiveAction } from "@/server/admin/masters-actions";

const accountTypeOptions = toOptions(accountTypeLabels);

// BHALO813 ログインマスタメンテ
export default function LoginsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="BHALO813"
        title="ログインマスタメンテ"
        titleEn="Logins"
        description="個人・法人・スタッフすべてのログイン情報。パスワードはハッシュ化して保存されるため表示できません（仕様書の「パスワード表示」は実装しません）。"
      />
      <Suspense fallback={<TableSkeleton />}>
        <LoginsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginsList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff("admin");
  const sp = await searchParams;
  const filters = {
    accountType: param(sp, "accountType"),
    memberNo: param(sp, "memberNo"),
    email: param(sp, "email"),
    updatedBefore: param(sp, "updatedBefore"),
    page: pageParam(sp),
  };
  const { rows, total, page, pageCount } = await listLogins(filters);

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <SearchForm clearHref="/admin/masters/logins">
        <SelectField name="accountType" label="個人法人区分" options={accountTypeOptions} defaultValue={filters.accountType} placeholder="すべて" />
        <TextField name="memberNo" label="会員番号" defaultValue={filters.memberNo} hint="部分一致" />
        <TextField name="email" label="メールアドレス" defaultValue={filters.email} hint="部分一致" />
        <TextField name="updatedBefore" label="最終更新日" type="date" defaultValue={filters.updatedBefore} hint="この日以前を対象" />
      </SearchForm>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ログインID</TableHead>
              <TableHead>区分</TableHead>
              <TableHead>会員番号</TableHead>
              <TableHead>氏名／法人名</TableHead>
              <TableHead>登録日</TableHead>
              <TableHead>最終更新日</TableHead>
              <TableHead>最終ログイン</TableHead>
              <TableHead className="text-center">メール確認</TableHead>
              <TableHead className="text-center">非アクティブ</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={10} />}
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{accountTypeLabels[u.accountType]}</TableCell>
                <TableCell className="font-mono text-xs">{u.memberNo}</TableCell>
                <TableCell>{u.displayName}</TableCell>
                <TableCell className="tabular-nums">{fmtDate(u.createdAt)}</TableCell>
                <TableCell className="tabular-nums">{fmtDate(u.updatedAt)}</TableCell>
                <TableCell className="tabular-nums">{fmtDateTime(u.lastLoginAt)}</TableCell>
                <TableCell className="text-center"><Mark on={u.emailVerified} label={u.emailVerified ? "確認済み" : "未確認"} /></TableCell>
                <TableCell className="text-center"><InactiveMark active={u.isActive} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {/* The signed-in administrator cannot lock themselves out. */}
                    {u.id !== staff.id && (
                      <form action={toggleUserActiveAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="active" value={u.isActive ? "0" : "1"} />
                        <Button type="submit" variant="outline" size="sm">
                          {u.isActive ? <UserXIcon /> : <UserCheckIcon />}
                          {u.isActive ? "非アクティブにする" : "アクティブにする"}
                        </Button>
                      </form>
                    )}
                    {u.id !== staff.id && (
                      <DeleteButton
                        action={deleteLoginAction}
                        id={u.id}
                        message="このログイン情報と関連する会員情報をすべて削除します。よろしいですか？"
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination pathname="/admin/masters/logins" searchParams={sp} page={page} pageCount={pageCount} total={total} pageSize={LOGIN_PAGE_SIZE} />
    </>
  );
}
