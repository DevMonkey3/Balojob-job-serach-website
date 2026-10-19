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

export function TableSkeleton() {
  return <div className="h-80 animate-pulse rounded-xl bg-muted" aria-busy="true" />;
}

export { Table };
