import { AdminLink } from "@/components/admin/admin-path";
import { cn } from "@/lib/utils";
import type { PendingCounts } from "@/server/admin/reviews";

// The three review queues on the console's /reviews page, styled like the
// dashboard's period toggle. Server-safe: plain links, the page reads ?tab.

export type QueueTab = keyof PendingCounts;

const tabs: { key: QueueTab; label: string }[] = [
  { key: "jobs", label: "求人" },
  { key: "candidates", label: "候補者プロフィール" },
  { key: "applications", label: "応募" },
];

export const isQueueTab = (v: string): v is QueueTab => tabs.some((t) => t.key === v);

/** Path inside the console (for <AdminLink> and `redirectTo`). */
export const queueHref = (tab: QueueTab) => `/reviews?tab=${tab}`;

export function QueueTabs({ active, counts }: { active: QueueTab; counts: PendingCounts }) {
  return (
    <nav aria-label="審査の種類" className="inline-flex flex-wrap rounded-lg border bg-background p-1">
      {tabs.map((t) => {
        const current = active === t.key;
        return (
          <AdminLink
            key={t.key}
            href={queueHref(t.key)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium",
              current ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t.label}
            <span className={cn("ml-1 tabular-nums", !current && counts[t.key] === 0 && "text-muted-foreground")}>
              ({counts[t.key].toLocaleString("ja-JP")})
            </span>
          </AdminLink>
        );
      })}
    </nav>
  );
}
