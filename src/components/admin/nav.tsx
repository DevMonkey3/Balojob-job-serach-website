"use client";

import { AdminLink, useConsolePathname } from "@/components/admin/admin-path";
import { cn } from "@/lib/utils";

/** `href` is the path inside the console, e.g. "/jobs/new". */
export type NavItem = { label: string; href: string };
export type NavGroup = { title: string; items: NavItem[] };

/** Sidebar menu. The deepest matching href is the active one. `onNavigate` lets the mobile sheet close itself. */
export function AdminNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = useConsolePathname();
  const active = groups
    .flatMap((g) => g.items)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <>
      <AdminLink
        href=""
        onClick={onNavigate}
        aria-current={pathname === "/" ? "page" : undefined}
        className={cn(
          "mb-4 block rounded-md px-3 py-2 text-sm font-semibold",
          pathname === "/" ? "bg-primary/10 text-primary" : "hover:bg-muted",
        )}
      >
        ダッシュボード
      </AdminLink>
      {groups.map((group) => (
        <div key={group.title} className="mb-4">
          <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground">{group.title}</p>
          <ul>
            {group.items.map((item) => (
              <li key={item.href}>
                <AdminLink
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active?.href === item.href ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-1.5 text-sm",
                    active?.href === item.href ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-muted",
                  )}
                >
                  {item.label}
                </AdminLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
