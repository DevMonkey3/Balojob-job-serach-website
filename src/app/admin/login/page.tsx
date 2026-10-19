import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { StaffLoginForm } from "@/components/admin/login-form";
import { getStaff } from "@/server/auth/staff";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "管理者ログイン", robots: { index: false, follow: false } };

// Staff sign-in, outside the console layout so it never needs a session.
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Logo />
      <Suspense fallback={<div className="h-80 w-full max-w-md animate-pulse rounded-xl bg-muted" aria-busy="true" />}>
        <LoginGate />
      </Suspense>
    </div>
  );
}

async function LoginGate() {
  if (await getStaff()) redirect("/admin");
  // No staff yet (fresh database): offer to create the first Administrator.
  const staffCount = await db.user.count({ where: { accountType: "staff" } });
  return <StaffLoginForm setup={staffCount === 0} />;
}
