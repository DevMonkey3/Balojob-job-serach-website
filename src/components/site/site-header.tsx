import { Suspense } from "react";
import Link from "next/link";
import { HeaderAuth, HeaderEmployerLink } from "@/components/site/header-auth";
import { Logo } from "@/components/site/logo";
import { MobileNav } from "@/components/site/mobile-nav";
import { SiteNav, SiteNavLinks } from "@/components/site/site-nav";

// Two rows: a thin strip for companies (scrolls away), and the bar with the
// logo, the menu and the login / register buttons, which stays on screen.
// Log in and register are always visible, on phones too. Anything that depends
// on the session cookie streams in behind a placeholder.
export function SiteHeader() {
  return (
    <>
      <div className="hidden border-b bg-muted/70 text-xs text-muted-foreground md:block">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between gap-4 px-4">
          <p>外国人材と日本の企業・学校をつなぐマッチングサイト</p>
          <div className="flex items-center gap-5">
            <Link href="/#companies" className="hover:text-primary">
              採用ご担当者さまへ
            </Link>
            <Suspense fallback={null}>
              <HeaderEmployerLink />
            </Suspense>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b bg-background/95 shadow-xs backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-brand-orange to-brand-red" aria-hidden />
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:gap-6">
          <Logo />
          <nav aria-label="メインメニュー" className="hidden h-full md:block">
            <Suspense fallback={<SiteNavLinks pathname={null} />}>
              <SiteNav />
            </Suspense>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Suspense fallback={<span className="h-10 w-40 animate-pulse rounded-lg bg-muted sm:w-56" />}>
              <HeaderAuth />
            </Suspense>
            <MobileNav />
          </div>
        </div>
      </header>
    </>
  );
}
