import { Suspense } from "react";
import type { Metadata } from "next";
import { LogOutIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/site/logo";
import { AdminMobileNav } from "@/components/admin/mobile-nav";
import { AdminNav, type NavGroup } from "@/components/admin/nav";
import { requireStaff, type Staff } from "@/server/auth/staff";
import { logoutStaffAction } from "@/server/auth/staff-actions";

export const metadata: Metadata = { title: "管理画面", robots: { index: false, follow: false } };

// Menu from BHALO800. ユーザ and マスタ are Administrator-only (BHALO810–816).
function navGroups(staff: Staff): NavGroup[] {
  const groups: NavGroup[] = [
    {
      title: "求人",
      items: [
        { label: "求人一覧", href: "/admin/jobs", screenId: "BHALO801" },
        { label: "新規求人の追加", href: "/admin/jobs/new", screenId: "BHALO802" },
      ],
    },
    {
      title: "企業",
      items: [
        { label: "企業一覧", href: "/admin/companies", screenId: "BHALO803" },
        { label: "新規企業の追加", href: "/admin/companies/new", screenId: "BHALO804" },
      ],
    },
    {
      title: "個人会員",
      items: [
        { label: "会員一覧", href: "/admin/members", screenId: "BHALO805" },
        { label: "新規会員の追加", href: "/admin/members/new", screenId: "BHALO806" },
      ],
    },
    {
      title: "学校",
      items: [
        { label: "学校一覧", href: "/admin/schools", screenId: "BHALO807" },
        { label: "新規学校の追加", href: "/admin/schools/new", screenId: "BHALO808" },
        { label: "生徒募集状況一覧", href: "/admin/recruitments", screenId: "BHALO809" },
      ],
    },
    {
      title: "コンタクト申込",
      items: [{ label: "申込一覧", href: "/admin/applications", screenId: "BHALO200" }],
    },
    {
      // Shown to everyone; the page itself sends staff without 更新 permission back.
      title: "審査",
      items: [{ label: "審査待ち一覧", href: "/admin/reviews", screenId: "MVP" }],
    },
  ];
  if (staff.isAdmin) {
    groups.push(
      {
        title: "ユーザ",
        items: [
          { label: "ユーザ一覧", href: "/admin/users", screenId: "BHALO810" },
          { label: "新規ユーザの追加", href: "/admin/users/new", screenId: "BHALO811" },
        ],
      },
      {
        title: "マスタ",
        items: [
          { label: "選択項目", href: "/admin/masters/options", screenId: "BHALO812" },
          { label: "ログイン", href: "/admin/masters/logins", screenId: "BHALO813" },
          { label: "採番", href: "/admin/masters/numbering", screenId: "BHALO814" },
          { label: "人気業種", href: "/admin/masters/industries", screenId: "BHALO815" },
          { label: "管理", href: "/admin/masters/settings", screenId: "BHALO816" },
        ],
      },
    );
  }
  return groups;
}

// The frame is static; the parts that depend on who is signed in stream in.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-t-4 border-t-brand-orange bg-background px-4">
        <Suspense fallback={null}>
          <MobileSidebar />
        </Suspense>
        <Logo href="/admin" />
        <Badge variant="outline" className="hidden sm:inline-flex">
          管理画面
        </Badge>
        <form action="/admin/search" method="get" className="relative ml-auto hidden w-72 md:block">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" placeholder="クイック検索（会員番号・氏名・法人名）" className="pl-8" aria-label="クイック検索" />
        </form>
        <Suspense fallback={<span className="h-8 w-40 animate-pulse rounded-md bg-muted" />}>
          <StaffMenu />
        </Suspense>
      </header>
      <div className="flex flex-1">
        <nav aria-label="管理メニュー" className="hidden w-60 shrink-0 border-r bg-background p-4 lg:block">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

async function StaffMenu() {
  const staff = await requireStaff();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm sm:inline">
        こんにちは、<span className="font-semibold">{staff.name}</span>さん
      </span>
      <form action={logoutStaffAction}>
        <Button type="submit" variant="ghost" size="sm">
          <LogOutIcon />
          ログアウト
        </Button>
      </form>
    </div>
  );
}

async function Sidebar() {
  const staff = await requireStaff();
  return <AdminNav groups={navGroups(staff)} />;
}

async function MobileSidebar() {
  const staff = await requireStaff();
  return <AdminMobileNav groups={navGroups(staff)} />;
}
