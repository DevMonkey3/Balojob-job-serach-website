"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sub-navigation of the employer area. The current page is highlighted from
// the URL, so the layout renders <EmployerNav> inside <Suspense> (Cache
// Components: the pathname is unknown while prerendering /employer/jobs/[id])
// with <EmployerNavLinks pathname={null}> as the fallback.

type Item = { label: string; href: string; /** Paths that also count as this item. */ prefixes?: string[] };

const items: Item[] = [
  { label: "企業情報", href: "/employer" },
  { label: "求人一覧", href: "/employer/jobs", prefixes: ["/employer/applicants"] },
  { label: "新規求人", href: "/employer/jobs/new" },
];

const matches = (item: Item, pathname: string) =>
  [item.href, ...(item.prefixes ?? [])].some((p) => pathname === p || (p !== "/employer" && pathname.startsWith(`${p}/`)));

/** The links; `pathname` null shows no active state. */
export function EmployerNavLinks({ pathname }: { pathname: string | null }) {
  const active =
    pathname === null ? undefined : items.filter((i) => matches(i, pathname)).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <ul className="flex flex-wrap items-center gap-1">
      {items.map((item) => {
        const current = active?.href === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                current && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
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

export function EmployerNav() {
  return <EmployerNavLinks pathname={usePathname()} />;
}
