import { Suspense } from "react";
import type { Metadata } from "next";
import { Building2Icon } from "lucide-react";
import { EmployerNav, EmployerNavLinks } from "@/components/employer/employer-nav";
import { getMember } from "@/server/auth/member";

export const metadata: Metadata = { robots: { index: false } };

// Employer area: a title band with the company's name, tabs, then the page.
// The frame is static; each page checks the session itself inside its own
// <Suspense>. Log out is in the site header.
export default function EmployerLayout({ children }: LayoutProps<"/employer">) {
  return (
    <div className="flex-1 bg-page">
      <div className="border-b bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange to-brand-red text-white shadow-sm">
              <Building2Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wider text-primary">企業ページ / For companies</p>
              <p className="truncate text-lg font-bold">
                <Suspense fallback={<span className="inline-block h-5 w-40 animate-pulse rounded bg-muted align-middle" />}>
                  <CompanyName />
                </Suspense>
              </p>
            </div>
          </div>
          <nav aria-label="企業メニュー" className="mt-4">
            <Suspense fallback={<EmployerNavLinks pathname={null} />}>
              <EmployerNav />
            </Suspense>
          </nav>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}

async function CompanyName() {
  const member = await getMember();
  return member?.kind === "corporate" ? member.name : "企業ページ";
}
