import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getMember, memberHome, safeReturnPath } from "@/server/auth/member";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Suspense fallback={<FormSkeleton />}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return <div className="h-96 w-full max-w-md animate-pulse rounded-xl bg-muted" aria-busy="true" />;
}

// Signed-in members have nothing to do here: straight to their own area.
async function Gate({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const member = await getMember();
  if (member) redirect(memberHome(member.kind));
  const { next } = await searchParams;
  return <LoginForm next={safeReturnPath(typeof next === "string" ? next : undefined)} />;
}
