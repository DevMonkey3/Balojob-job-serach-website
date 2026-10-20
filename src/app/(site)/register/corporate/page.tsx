import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountForm } from "@/components/auth/account-form";
import { getMember, memberHome } from "@/server/auth/member";

export const metadata: Metadata = { title: "法人会員登録" };

export default function CorporateRegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Suspense fallback={<div className="h-[36rem] w-full max-w-md animate-pulse rounded-xl bg-muted" aria-busy="true" />}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  const member = await getMember();
  if (member) redirect(memberHome(member.kind));
  return <AccountForm kind="corporate" />;
}
