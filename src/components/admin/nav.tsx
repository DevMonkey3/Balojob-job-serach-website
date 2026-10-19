"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { label: string; href: string; screenId: string };
export type NavGroup = { title: string; items: NavItem[] };

/** Sidebar menu. The deepest matching href is the active one. */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const active = groups
    .flatMap((g) => g.items)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <>
      <Link
        href="/admin"
        className={cn(
          "mb-4 block rounded-md px-3 py-2 text-sm font-semibold",
          pathname === "/admin" ? "bg-primary/10 text-primary" : "hover:bg-muted",
        )}
      >
        ダッシュボード
      </Link>
      {groups.map((group) => (
        <div key={group.title} className="mb-4">
          <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground">{group.title}</p>
          <ul>
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.screenId}
                  aria-current={active?.href === item.href ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-1.5 text-sm",
                    active?.href === item.href ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-muted",
                  )}
                >
                  {item.label}
                  <span className="font-mono text-[10px] text-muted-foreground">{item.screenId}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
