import { Suspense } from "react";
import type { Metadata } from "next";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployerNav, EmployerNavLinks } from "@/components/employer/employer-nav";
import { logoutMemberAction } from "@/server/auth/member-actions";

export const metadata: Metadata = { robots: { index: false } };

// Employer area (BHALO111–117). The frame is static; each page checks the
// session itself inside its own <Suspense>.
export default function EmployerLayout({ children }: LayoutProps<"/employer">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <nav aria-label="企業メニュー">
          <Suspense fallback={<EmployerNavLinks pathname={null} />}>
            <EmployerNav />
          </Suspense>
        </nav>
        <form action={logoutMemberAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOutIcon />
            ログアウト
          </Button>
        </form>
      </div>
      {children}
    </div>
  );
}
