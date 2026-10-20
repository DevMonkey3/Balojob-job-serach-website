import { Badge } from "@/components/ui/badge";
import { Table, TableCell, TableRow } from "@/components/ui/table";

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge variant="secondary">アクティブ</Badge> : <Badge variant="outline">非アクティブ</Badge>;
}

/** The specs draw yes/no columns as ☑ / ☐. */
export function Mark({ on, label }: { on: boolean; label?: string }) {
  return (
    <span aria-label={label} className="text-base">
      {on ? "☑" : "☐"}
    </span>
  );
}

/** 非アクティブ column: checked when the row is inactive. */
export function InactiveMark({ active }: { active: boolean }) {
  return <Mark on={!active} label={active ? "アクティブ" : "非アクティブ"} />;
}

export function YesNo({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  return <>{value ? "有り" : "無し"}</>;
}

export function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
        対象データがありません。
      </TableCell>
    </TableRow>
  );
}

/** Title line plus a table outline, so list pages don't jump when the rows arrive. */
export function TableSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="h-10 border-b bg-muted/50" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { Table };
