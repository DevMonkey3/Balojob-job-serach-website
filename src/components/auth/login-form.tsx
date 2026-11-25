"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { Building2Icon, LogInIcon, UserRoundIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/admin/fields";
import { FormErrorsContext } from "@/components/admin/form-context";
import { cn } from "@/lib/utils";
import { loginMemberAction } from "@/server/auth/member-actions";
import type { ActionState } from "@/server/admin/form";

const initialState: ActionState = {};

export type LoginAudience = "candidate" | "employer";

const copy = {
  candidate: {
    title: "求職者ログイン",
    en: "Log in for job seekers and students",
    register: { href: "/register/individual", label: "はじめての方：無料会員登録（個人）" },
  },
  employer: {
    title: "企業ログイン",
    en: "Log in for companies",
    register: { href: "/register/corporate", label: "はじめての方：法人会員登録（無料）" },
  },
} as const;

// 会員ログイン: one form and one action for candidates and companies; the
// action sends each to their own area (or back to `next` when they came from a
// member page). The two tabs only change the wording, so nobody has to wonder
// which door is theirs.
export function LoginForm({ next, audience }: { next?: string; audience: LoginAudience }) {
  const [state, formAction, pending] = useActionState(loginMemberAction, initialState);
  const text = copy[audience];

  // Submitting by hand keeps the typed login ID on screen after a failed attempt.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  const tabHref = (as: LoginAudience) => {
    const params = new URLSearchParams();
    if (as === "employer") params.set("as", "employer");
    if (next) params.set("next", next);
    const query = params.toString();
    return query ? `/login?${query}` : "/login";
  };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-lg shadow-brand-orange/10">
      <nav aria-label="ログインの種類" className="grid grid-cols-2 border-b bg-muted/60 text-sm font-semibold">
        {(
          [
            ["candidate", "求職者の方", UserRoundIcon],
            ["employer", "企業の方", Building2Icon],
          ] as const
        ).map(([key, label, Icon]) => (
          <Link
            key={key}
            href={tabHref(key)}
            replace
            aria-current={audience === key ? "page" : undefined}
            className={cn(
              "flex h-12 items-center justify-center gap-2 border-b-[3px] border-transparent text-muted-foreground transition-colors hover:text-foreground",
              audience === key && "border-primary bg-card text-primary hover:text-primary",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold">{text.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{text.en}</p>
        </div>

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
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.message}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red text-base font-bold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:opacity-60"
            >
              {pending ? <Spinner /> : <LogInIcon className="size-5" aria-hidden />}
              {pending ? "送信中…" : "ログイン"}
            </button>
          </form>
        </FormErrorsContext>

        <div className="flex flex-col gap-3 border-t pt-5">
          <Link
            href={text.register.href}
            className="flex h-11 items-center justify-center rounded-lg border border-primary/40 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            {text.register.label}
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            パスワードの変更は準備中です (Password change is coming soon)
          </p>
        </div>
      </div>
    </div>
  );
}
