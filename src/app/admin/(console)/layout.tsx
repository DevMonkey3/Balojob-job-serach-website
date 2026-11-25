import { Suspense } from "react";
import type { Metadata } from "next";
import { LogOutIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/site/logo";
import { AdminPathProvider } from "@/components/admin/admin-path";
import { AdminMobileNav } from "@/components/admin/mobile-nav";
import { AdminNav, type NavGroup } from "@/components/admin/nav";
import { TableSkeleton } from "@/components/admin/status";
import { adminPath, requireConsoleRequest } from "@/server/admin/path";
import { requireStaff, type Staff } from "@/server/auth/staff";
import { logoutStaffAction } from "@/server/auth/staff-actions";

export const metadata: Metadata = { title: "管理画面", robots: { index: false, follow: false } };

// Menu from BHALO800. ユーザ and マスタ are Administrator-only (BHALO810–816).
// `href` is the path inside the console; AdminNav adds the console address.
function navGroups(staff: Staff): NavGroup[] {
  const groups: NavGroup[] = [
    {
      title: "求人",
      items: [
        { label: "求人一覧", href: "/jobs" },
        { label: "新規求人の追加", href: "/jobs/new" },
      ],
    },
    {
      title: "企業",
      items: [
        { label: "企業一覧", href: "/companies" },
        { label: "新規企業の追加", href: "/companies/new" },
      ],
    },
    {
      title: "個人会員",
      items: [
        { label: "会員一覧", href: "/members" },
        { label: "新規会員の追加", href: "/members/new" },
      ],
    },
    {
      title: "学校",
      items: [
        { label: "学校一覧", href: "/schools" },
        { label: "新規学校の追加", href: "/schools/new" },
        { label: "生徒募集状況一覧", href: "/recruitments" },
      ],
    },
    {
      title: "コンタクト申込",
      items: [{ label: "申込一覧", href: "/applications" }],
    },
    {
      // Shown to everyone; the page itself sends staff without 更新 permission back.
      title: "審査",
      items: [{ label: "審査待ち一覧", href: "/reviews" }],
    },
  ];
  if (staff.isAdmin) {
    groups.push(
      {
        title: "ユーザ",
        items: [
          { label: "ユーザ一覧", href: "/users" },
          { label: "新規ユーザの追加", href: "/users/new" },
        ],
      },
      {
        title: "マスタ",
        items: [
          { label: "選択項目", href: "/masters/options" },
          { label: "ログイン", href: "/masters/logins" },
          { label: "採番", href: "/masters/numbering" },
          { label: "人気業種", href: "/masters/industries" },
          { label: "管理", href: "/masters/settings" },
        ],
      },
    );
  }
  return groups;
}

// The console's address (ADMIN_PATH) is only known while the server runs, so
// nothing that contains it can be prerendered. What is prerendered is the
// empty frame below (the fallback); the real frame replaces it per request.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <Frame staffMenu={staffMenuFallback}>
          <TableSkeleton />
        </Frame>
      }
    >
      <ConsoleFrame>{children}</ConsoleFrame>
    </Suspense>
  );
}

const staffMenuFallback = <span className="h-8 w-40 animate-pulse rounded-md bg-muted" />;

// The frame renders straight away; the parts that depend on who is signed in stream in.
async function ConsoleFrame({ children }: { children: React.ReactNode }) {
  // Only for requests the proxy let in through the console address.
  await requireConsoleRequest();
  return (
    <AdminPathProvider base={adminPath()}>
      <Frame
        home={adminPath()}
        mobileNav={
          <Suspense fallback={null}>
            <MobileSidebar />
          </Suspense>
        }
        staffMenu={
          <Suspense fallback={staffMenuFallback}>
            <StaffMenu />
          </Suspense>
        }
        sidebar={
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
        }
      >
        {children}
      </Frame>
    </AdminPathProvider>
  );
}

/**
 * Header, menu column and content area. Without `home` (the console's
 * address) it is the placeholder shown while the page loads: same layout,
 * but the logo and the search box do nothing.
 */
function Frame({
  home,
  mobileNav,
  staffMenu,
  sidebar,
  children,
}: {
  home?: string;
  mobileNav?: React.ReactNode;
  staffMenu: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const loading = home === undefined;
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-t-4 border-t-brand-orange bg-background px-4">
        {mobileNav}
        <div inert={loading} className="contents">
          <Logo href={home ?? ""} />
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          管理画面
        </Badge>
        <form
          action={loading ? undefined : `${home}/search`}
          method="get"
          inert={loading}
          className="relative ml-auto hidden w-72 md:block"
        >
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" placeholder="クイック検索（会員番号・氏名・法人名）" className="pl-8" aria-label="クイック検索" />
        </form>
        {staffMenu}
      </header>
      <div className="flex flex-1">
        <nav aria-label="管理メニュー" className="hidden w-60 shrink-0 border-r bg-background p-4 lg:block">
          {sidebar}
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
