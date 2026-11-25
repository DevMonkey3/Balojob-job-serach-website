import Link from "next/link";
import { ArrowRightIcon, Building2Icon, LogInIcon, UserRoundIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// 会員登録: the card on the top page (signed-out visitors) and the /register screen.
export function RegisterChoice({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-4 rounded-2xl border bg-card p-6 shadow-lg shadow-brand-orange/10", className)}>
      <div className="text-center">
        <p className="text-lg font-bold">はじめての方へ</p>
        <p className="text-xs text-muted-foreground">Register here. It is free.</p>
      </div>
      <Link
        href="/register/individual"
        className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-brand-orange to-brand-red px-4 py-3.5 text-white shadow-sm transition-[filter] hover:brightness-110"
      >
        <UserRoundIcon className="size-6 shrink-0" aria-hidden />
        <span className="flex-1">
          <span className="block text-base font-bold">無料会員登録（個人の方）</span>
          <span className="block text-xs opacity-90">仕事・学校を探す / For individuals</span>
        </span>
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
      <Link
        href="/register/corporate"
        className="group flex items-center gap-3 rounded-xl border border-primary/30 px-4 py-3.5 transition-colors hover:bg-primary/5"
      >
        <Building2Icon className="size-6 shrink-0 text-primary" aria-hidden />
        <span className="flex-1">
          <span className="block text-base font-bold">法人会員登録（企業の方）</span>
          <span className="block text-xs text-muted-foreground">求人を掲載する / For companies</span>
        </span>
        <ArrowRightIcon className="size-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
      <p className="flex items-center justify-center gap-1.5 border-t pt-4 text-sm">
        <LogInIcon className="size-4 text-muted-foreground" aria-hidden />
        会員の方は
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          ログイン
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        学校（大学・専門学校・日本語学校）の会員登録は準備中です
      </p>
    </div>
  );
}
