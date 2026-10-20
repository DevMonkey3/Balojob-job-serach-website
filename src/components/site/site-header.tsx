import { Suspense } from "react";
import Link from "next/link";
import { HeaderAuth } from "@/components/site/header-auth";
import { Logo } from "@/components/site/logo";
import { MobileNav } from "@/components/site/mobile-nav";

// The register / My Page buttons stay visible while scrolling (サイトマップ).
// They depend on the session cookie, so they stream in behind a placeholder.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="h-1 bg-gradient-to-r from-brand-orange to-brand-red" aria-hidden />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="メインメニュー" className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/#jobs" className="hover:text-primary">
            求人を探す
          </Link>
          <Link href="/#schools" className="hover:text-primary">
            学校を探す
          </Link>
          <Link href="/#companies" className="hover:text-primary">
            企業・学校の方へ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Suspense fallback={<span className="h-9 w-44 animate-pulse rounded-lg bg-muted" />}>
            <HeaderAuth />
          </Suspense>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
