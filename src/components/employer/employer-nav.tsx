"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2Icon, ListIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Tabs of the employer area. The current page is highlighted from the URL, so
// the layout renders <EmployerNav> inside <Suspense> (Cache Components: the
// pathname is unknown while prerendering /employer/jobs/[id]) with
// <EmployerNavLinks pathname={null}> as the fallback.

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Paths that also count as this item. */
  prefixes?: string[];
};

const items: Item[] = [
  { label: "求人一覧", href: "/employer/jobs", icon: ListIcon, prefixes: ["/employer/applicants"] },
  { label: "新規求人", href: "/employer/jobs/new", icon: PlusIcon },
  { label: "企業情報", href: "/employer", icon: Building2Icon },
];

const matches = (item: Item, pathname: string) =>
  [item.href, ...(item.prefixes ?? [])].some((p) => pathname === p || (p !== "/employer" && pathname.startsWith(`${p}/`)));

/** The links; `pathname` null shows no active state. */
export function EmployerNavLinks({ pathname }: { pathname: string | null }) {
  const active =
    pathname === null ? undefined : items.filter((i) => matches(i, pathname)).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <ul className="-mb-px flex items-stretch gap-1 overflow-x-auto">
      {items.map((item) => {
        const current = active?.href === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-1.5 border-b-[3px] border-transparent px-4 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                current && "border-primary text-primary hover:text-primary",
              )}
            >
              <item.icon className="size-4" aria-hidden />
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
