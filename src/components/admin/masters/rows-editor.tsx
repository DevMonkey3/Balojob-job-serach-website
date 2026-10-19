"use client";

import { useRef, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { controlClass } from "@/components/admin/fields";
import { useFieldError } from "@/components/admin/form-context";
import { cn } from "@/lib/utils";

// Spreadsheet-style editor for small master tables (BHALO812, 815): one input
// per cell, [行追加] and 削除 per row, all submitted together by the FormShell
// around it. Every row posts the same field names, so the server action gets
// one array per column. A check column posts "1"/"0" through a hidden input so
// an unchecked row still takes up its slot in the array.

export type EditorColumn = {
  name: string;
  label: string;
  kind?: "text" | "number" | "check";
  required?: boolean;
  maxLength?: number;
  /** Classes for the column's cells (width, alignment). */
  className?: string;
};

/** Values by column name. `id` is "" for a row that is not saved yet. Extra keys are kept but not posted. */
export type EditorRow = { id: string } & Record<string, string | boolean>;

type Row = { key: number; id: string; values: Record<string, string | boolean> };

const toEditorRow = (row: Row): EditorRow => ({ ...row.values, id: row.id });

export function RowsEditor({
  columns,
  initialRows,
  blankRow,
  rowExtra,
}: {
  columns: EditorColumn[];
  initialRows: EditorRow[];
  /** Values of a row added with [行追加], given the rows on screen. */
  blankRow: (rows: EditorRow[]) => Record<string, string | boolean>;
  /** An extra cell per row, e.g. a link to the row's children. */
  rowExtra?: { label: string; render: (row: EditorRow) => React.ReactNode };
}) {
  const [rows, setRows] = useState<Row[]>(() => initialRows.map((r, i) => ({ key: i, id: r.id, values: r })));
  const nextKey = useRef(initialRows.length);

  function update(key: number, name: string, value: string | boolean) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, values: { ...r.values, [name]: value } } : r)));
  }

  function add() {
    const row: Row = { key: nextKey.current++, id: "", values: blankRow(rows.map(toEditorRow)) };
    setRows((rs) => [...rs, row]);
  }

  function remove(key: number) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  const colSpan = columns.length + 2 + (rowExtra ? 1 : 0);

  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-right">№</TableHead>
            {columns.map((c) => (
              <TableHead key={c.name} className={c.className}>
                {c.label}
                {c.required && <span className="text-destructive">*</span>}
              </TableHead>
            ))}
            {rowExtra && <TableHead>{rowExtra.label}</TableHead>}
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                行がありません。[行追加]で追加してください。
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, index) => (
            <TableRow key={row.key} className="hover:bg-transparent">
              <TableCell className="text-right tabular-nums text-muted-foreground">
                <input type="hidden" name="id" value={row.id} />
                {index + 1}
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.name} className={cn("align-top", c.className)}>
                  <Cell column={c} value={row.values[c.name]} index={index} onChange={(v) => update(row.key, c.name, v)} />
                </TableCell>
              ))}
              {rowExtra && <TableCell>{rowExtra.render(toEditorRow(row))}</TableCell>}
              <TableCell>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(row.key)} aria-label={`${index + 1}行目を削除`}>
                  <Trash2Icon />
                  削除
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t p-3">
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <PlusIcon />
          行追加
        </Button>
      </div>
    </div>
  );
}

function Cell({
  column,
  value,
  index,
  onChange,
}: {
  column: EditorColumn;
  value: string | boolean | undefined;
  index: number;
  onChange: (value: string | boolean) => void;
}) {
  const error = useFieldError(`${index}.${column.name}`);
  const label = `${index + 1}行目 ${column.label}`;

  if (column.kind === "check") {
    const on = value === true || value === "1";
    return (
      <>
        <input type="hidden" name={column.name} value={on ? "1" : "0"} />
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
          className="size-4 accent-primary"
        />
      </>
    );
  }

  return (
    <>
      <input
        type={column.kind === "number" ? "number" : "text"}
        name={column.name}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        maxLength={column.maxLength}
        aria-label={label}
        aria-invalid={!!error}
        className={cn(controlClass, "min-w-32")}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
