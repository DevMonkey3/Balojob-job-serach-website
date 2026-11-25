"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The header's main menu on desktop. The current section is underlined from
// the URL, so the header renders <SiteNav> inside <Suspense> (Cache
// Components: the pathname is unknown while prerendering dynamic routes) with
// <SiteNavLinks pathname={null}> as the fallback.

export const siteNavItems = [
  { href: "/jobs", label: "求人を探す", en: "Find jobs", section: "/jobs" },
  { href: "/schools", label: "学校を探す", en: "Find schools", section: "/schools" },
  { href: "/#flow", label: "ご利用の流れ", en: "How it works", section: null },
  { href: "/#companies", label: "企業の方へ", en: "For companies", section: null },
] as const;

export function SiteNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex h-full items-stretch">
      {siteNavItems.map((item) => {
        const current = !!pathname && !!item.section && (pathname === item.section || pathname.startsWith(`${item.section}/`));
        return (
          <li key={item.href} className="flex">
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "relative flex items-center px-3.5 text-sm font-semibold text-foreground/80 transition-colors hover:text-primary lg:px-4",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-transparent after:transition-colors hover:after:bg-primary/30",
                current && "text-primary after:bg-primary hover:after:bg-primary",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SiteNav() {
  return <SiteNavLinks pathname={usePathname()} />;
}
