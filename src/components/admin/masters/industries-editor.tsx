"use client";

import { FormShell } from "@/components/admin/form-shell";
import { RowsEditor, type EditorColumn, type EditorRow } from "@/components/admin/masters/rows-editor";
import { saveIndustriesAction } from "@/server/admin/masters-actions";
import type { IndustryRow } from "@/server/admin/masters";

const columns: EditorColumn[] = [
  { name: "labelJa", label: "日本語名", required: true, maxLength: 60 },
  { name: "labelEn", label: "英語名", maxLength: 120 },
  { name: "sortOrder", label: "表示順", kind: "number", className: "w-24" },
];

const nextSortOrder = (rows: EditorRow[]) =>
  String(rows.reduce((max, r) => Math.max(max, Number(r.sortOrder) || 0), 0) + 1);

// BHALO815 人気業種マスタメンテ: the whole table on one screen.
export function IndustriesEditor({ rows }: { rows: IndustryRow[] }) {
  const initialRows: EditorRow[] = rows.map((r) => ({
    id: r.id,
    labelJa: r.labelJa,
    labelEn: r.labelEn,
    sortOrder: String(r.sortOrder),
  }));

  return (
    <FormShell action={saveIndustriesAction} confirmEmpty={false}>
      <RowsEditor
        columns={columns}
        initialRows={initialRows}
        blankRow={(current) => ({ labelJa: "", labelEn: "", sortOrder: nextSortOrder(current) })}
      />
    </FormShell>
  );
}
