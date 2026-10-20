"use client";

import { CheckboxField, FieldGroup, HiddenField, TextField } from "@/components/admin/fields";
import { useFieldError } from "@/components/admin/form-context";
import { FormShell } from "@/components/admin/form-shell";
import { saveStaffUserAction } from "@/server/admin/staff-users-actions";
import type { StaffUser } from "@/server/admin/staff-users";

// BHALO811 新規ユーザ追加編集. `user` is null when adding; `self` when the
// signed-in administrator is editing their own account.
export function UserForm({
  user,
  self,
  passwordMinLength,
}: {
  user: StaffUser | null;
  self: boolean;
  passwordMinLength: number;
}) {
  return (
    <FormShell action={saveStaffUserAction} cancelHref="/admin/users" submitLabel={user ? "更新" : "登録"}>
      {user && <HiddenField name="id" value={user.id} />}

      <FieldGroup title="ユーザ情報" screenId="BHALO811">
        <TextField name="name" label="ユーザ名" required maxLength={80} defaultValue={user?.name} autoComplete="off" />
        {user ? (
          <TextField
            name="_email"
            label="ログインID（メールアドレス）"
            defaultValue={user.email}
            readOnly
            hint="ログインIDは変更できません。"
          />
        ) : (
          <TextField
            name="email"
            label="ログインID（メールアドレス）"
            type="email"
            required
            maxLength={254}
            autoComplete="off"
          />
        )}
        <TextField
          name="password"
          label="パスワード"
          type="password"
          required={!user}
          autoComplete="new-password"
          hint={user ? `変更する場合のみ入力（${passwordMinLength}文字以上）` : `${passwordMinLength}文字以上`}
        />
        <TextField name="confirm" label="パスワード確認" type="password" required={!user} autoComplete="new-password" />

        <div className="sm:col-span-2">
          <p className="mb-1 text-sm font-medium">権限</p>
          <CheckboxField
            name="isAdmin"
            label="Administrator"
            description="すべての権限に加えて、ユーザとマスタを管理できます。"
            defaultChecked={user?.isAdmin}
          />
          <FieldError name="isAdmin" />
          <CheckboxField name="canView" label="参照権限" defaultChecked={user ? user.canView : true} />
          <CheckboxField name="canEdit" label="更新権限" defaultChecked={user?.canEdit} />
          <CheckboxField name="canDelete" label="削除権限" defaultChecked={user?.canDelete} />
        </div>

        <div className="sm:col-span-2">
          <CheckboxField
            name="inactive"
            label="非アクティブ"
            description="チェックすると管理画面にログインできなくなります。"
            defaultChecked={user ? !user.isActive : false}
          />
          <FieldError name="inactive" />
        </div>

        {self && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            ご自身のアカウントです。Administrator権限を外すことと非アクティブにすることはできません。
          </p>
        )}
      </FieldGroup>
    </FormShell>
  );
}

// CheckboxField has no error slot; the self-edit checks report on these names.
function FieldError({ name }: { name: string }) {
  const error = useFieldError(name);
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );
}
