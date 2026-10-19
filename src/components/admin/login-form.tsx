"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/admin/fields";
import { FormErrorsContext } from "@/components/admin/form-context";
import { loginStaffAction, setupFirstAdminAction } from "@/server/auth/staff-actions";
import type { ActionState } from "@/server/admin/form";

const initialState: ActionState = {};

/** Staff sign-in. With `setup`, creates the first Administrator instead (no staff exists yet). */
export function StaffLoginForm({ setup }: { setup: boolean }) {
  const [state, action, pending] = useActionState(setup ? setupFirstAdminAction : loginStaffAction, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="font-mono text-xs text-muted-foreground">管理画面</p>
        <CardTitle className="text-xl">{setup ? "初期管理者の作成" : "管理者ログイン"}</CardTitle>
        <CardDescription>
          {setup
            ? "スタッフがまだ登録されていません。最初のAdministratorを作成してください。"
            : "ユーザマスタに登録されたログインIDとパスワードでログインします。"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormErrorsContext value={state.errors ?? {}}>
          <form action={action} noValidate className="flex flex-col gap-4">
            {setup && <TextField name="name" label="ユーザ名" required autoComplete="name" maxLength={80} />}
            <TextField
              name="email"
              label="ログインID（メールアドレス）"
              type="email"
              required
              autoComplete="username"
              maxLength={254}
            />
            <TextField
              name="password"
              label="パスワード"
              type="password"
              required
              autoComplete={setup ? "new-password" : "current-password"}
              hint={setup ? "8文字以上" : undefined}
            />
            {setup && (
              <TextField name="confirm" label="パスワードの確認入力" type="password" required autoComplete="new-password" />
            )}
            {state.message && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "送信中…" : setup ? "作成してログイン" : "ログイン"}
            </Button>
          </form>
        </FormErrorsContext>
      </CardContent>
    </Card>
  );
}
