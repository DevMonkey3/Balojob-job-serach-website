"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/admin/fields";
import { FormErrorsContext } from "@/components/admin/form-context";
import { loginMemberAction } from "@/server/auth/member-actions";
import type { ActionState } from "@/server/admin/form";

const initialState: ActionState = {};

// BHALO001 会員ログイン: one form for candidates and employers; the action
// sends each to their own area (or back to `next` when they came from a member page).
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginMemberAction, initialState);

  // Submitting by hand keeps the typed login ID on screen after a failed attempt.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="font-mono text-xs text-muted-foreground">BHALO001</p>
        <CardTitle className="text-xl">
          会員ログイン <span className="text-base font-normal text-muted-foreground">Log in</span>
        </CardTitle>
        <CardDescription>
          バロジョブは、より速く、より簡単に世界中の優秀な人材と企業をマッチングするお手伝いをします
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormErrorsContext value={state.errors ?? {}}>
          <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {next && <input type="hidden" name="next" value={next} />}
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
              label="パスワード (Password)"
              type="password"
              required
              autoComplete="current-password"
              maxLength={200}
            />
            {state.message && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? (
                <>
                  <Spinner />
                  送信中…
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </FormErrorsContext>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Link href="/register" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          新規会員登録（無料）
        </Link>
        <p className="text-xs text-muted-foreground">パスワードの変更は準備中です (Password change is coming soon)</p>
      </CardFooter>
    </Card>
  );
}
