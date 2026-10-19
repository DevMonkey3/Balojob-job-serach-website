"use client";

import Link from "next/link";
import { HiddenField } from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { RowsEditor, type EditorColumn, type EditorRow } from "@/components/admin/masters/rows-editor";
import { saveOptionsAction } from "@/server/admin/masters-actions";
import type { OptionRow } from "@/server/admin/masters";

const columns: EditorColumn[] = [
  { name: "labelJa", label: "日本語名", required: true, maxLength: 120 },
  { name: "labelEn", label: "英語名", maxLength: 120 },
  { name: "labelBn", label: "ベンガル語名", maxLength: 120 },
  { name: "sortOrder", label: "表示順", kind: "number", className: "w-24" },
  { name: "isActive", label: "有効", kind: "check", className: "w-16 text-center" },
];

const nextSortOrder = (rows: EditorRow[]) =>
  String(rows.reduce((max, r) => Math.max(max, Number(r.sortOrder) || 0), 0) + 1);

// BHALO812: one level of one category. `parentId` null = level 1, whose rows
// link to their children (level 2).
export function OptionsEditor({ category, parentId, rows }: { category: string; parentId: string | null; rows: OptionRow[] }) {
  const initialRows: EditorRow[] = rows.map((r) => ({
    id: r.id,
    labelJa: r.labelJa,
    labelEn: r.labelEn,
    labelBn: r.labelBn,
    sortOrder: String(r.sortOrder),
    isActive: r.isActive,
    childCount: String(r.childCount),
  }));

  return (
    <FormShell action={saveOptionsAction} confirmEmpty={false}>
      <HiddenField name="category" value={category} />
      <HiddenField name="parentId" value={parentId ?? ""} />
      <RowsEditor
        columns={columns}
        initialRows={initialRows}
        blankRow={(current) => ({ labelJa: "", labelEn: "", labelBn: "", sortOrder: nextSortOrder(current), isActive: true })}
        rowExtra={
          parentId === null
            ? {
                label: "レベル2",
                render: (row) =>
                  row.id ? (
                    <Link
                      href={`/admin/masters/options?category=${category}&parent=${row.id}`}
                      className="text-primary hover:underline"
                    >
                      レベル2 (子項目) {row.childCount}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">更新後に編集できます</span>
                  ),
              }
            : undefined
        }
      />
    </FormShell>
  );
}
