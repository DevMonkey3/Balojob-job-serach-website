"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/admin/fields";
import { FormErrorsContext } from "@/components/admin/form-context";
import { registerEmployerAction, registerIndividualAction } from "@/server/auth/member-actions";
import type { ActionState } from "@/server/admin/form";

// BHALO002 個人会員登録 / BHALO003 法人会員登録: creates the login and signs in.
// Individuals continue to the profile wizard, companies to their employer page.

const initialState: ActionState = {};

const copy = {
  individual: { screenId: "BHALO002", title: "新規個人会員登録", titleEn: "Individuals" },
  corporate: { screenId: "BHALO003", title: "新規法人会員登録", titleEn: "Companies" },
} as const;

export function AccountForm({ kind }: { kind: "individual" | "corporate" }) {
  const [state, formAction, pending] = useActionState(
    kind === "individual" ? registerIndividualAction : registerEmployerAction,
    initialState,
  );
  const { screenId, title, titleEn } = copy[kind];

  // Submitting by hand keeps the typed values on screen when the action comes
  // back with validation errors (React resets a form after a native action submit).
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="font-mono text-xs text-muted-foreground">{screenId}</p>
        <CardTitle className="text-xl">
          {title} <span className="text-base font-normal text-muted-foreground">{titleEn}</span>
        </CardTitle>
        <CardDescription>ログイン情報を登録してください (Create your login)</CardDescription>
      </CardHeader>
      <CardContent>
        <FormErrorsContext value={state.errors ?? {}}>
          <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {kind === "individual" ? (
              <TextField
                name="fullName"
                label="氏名 (Full name)"
                required
                autoComplete="name"
                maxLength={80}
                hint="パスポートと同じ表記 (As written in your passport)"
              />
            ) : (
              <>
                <TextField
                  name="companyName"
                  label="会社・団体名 (Company name)"
                  required
                  autoComplete="organization"
                  maxLength={120}
                />
                <TextField
                  name="representative"
                  label="代表者名 (Representative)"
                  required
                  autoComplete="name"
                  maxLength={80}
                />
              </>
            )}
            <TextField
              name="email"
              label="ログインID（メールアドレス）"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              hint="半角 (Email address — this is your login ID)"
            />
            <TextField
              name="password"
              label="パスワード (Password)"
              type="password"
              required
              autoComplete="new-password"
              maxLength={200}
              hint="半角8文字以上 (At least 8 characters)"
            />
            <TextField
              name="confirm"
              label="パスワードの確認入力 (Confirm password)"
              type="password"
              required
              autoComplete="new-password"
              maxLength={200}
            />
            {state.message && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              ※ メール認証は今後追加予定です (Email verification will be added)
            </p>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "送信中…" : "登録して次へ (Continue)"}
            </Button>
          </form>
        </FormErrorsContext>
      </CardContent>
      {kind === "corporate" && (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            学校（大学・専門学校・日本語学校）の会員登録は準備中です
            <span className="block">School registration (universities, vocational and language schools) is coming soon.</span>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
