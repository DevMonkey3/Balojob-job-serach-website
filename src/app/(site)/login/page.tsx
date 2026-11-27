import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getMember, memberHome, safeReturnPath } from "@/server/auth/member";

export const metadata: Metadata = pageMeta({ title: "ログイン", path: "/login" });

// 会員ログイン for candidates and companies (?as=employer picks the company tab).
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex flex-1 items-start justify-center bg-page px-4 py-10 md:py-16">
      <Suspense fallback={<FormSkeleton />}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return <div className="h-[30rem] w-full max-w-md animate-pulse rounded-2xl bg-muted" aria-busy="true" />;
}

// Signed-in members have nothing to do here: straight to their own area.
async function Gate({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const member = await getMember();
  if (member) redirect(memberHome(member.kind));
  const { next, as } = await searchParams;
  return (
    <LoginForm
      next={safeReturnPath(typeof next === "string" ? next : undefined)}
      audience={as === "employer" ? "employer" : "candidate"}
    />
  );
}
