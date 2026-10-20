"use client";

import { useId, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FieldGroup, HiddenField, controlClass } from "@/components/admin/fields";
import { useFieldError } from "@/components/admin/form-context";
import { FormShell } from "@/components/admin/form-shell";
import type { Option } from "@/lib/admin/labels";
import {
  staticSectionOptions,
  type SectionDef,
  type SectionField,
  type SectionOptionLists,
} from "@/lib/admin/member-sections";
import { saveMemberSectionAction } from "@/server/admin/members-actions";
import type { SectionRow } from "@/server/admin/members";
import { cn } from "@/lib/utils";

// One child table of BHALO806 (言語スキル, 学歴, …) as a small table of input
// rows, saved whole like the wizard screens: [行を追加する] appends a row,
// [削除] removes one (or clears it when it is the only row), and the server
// action replaces the member's rows with what is submitted as `rows.<i>.<field>`.

type Props = {
  individualId: string;
  section: SectionDef;
  rows: SectionRow[];
  /** Master-backed option lists; the code-defined ones are merged in here. */
  options: SectionOptionLists;
};

export function SectionEditor(props: Props) {
  // A save redirects back with the stored rows; remounting on that change
  // shows them instead of the edited copy (the key is stable while editing).
  return <RowsEditor key={JSON.stringify(props.rows)} {...props} />;
}

type Item = { key: number; values: SectionRow };

const toOptions = (list: readonly (Option | string)[] | undefined): Option[] =>
  (list ?? []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));

function RowsEditor({ individualId, section, rows, options }: Props) {
  const id = useId();
  const lists = { ...staticSectionOptions, ...options };
  const [items, setItems] = useState<Item[]>(() =>
    rows.length > 0 ? rows.map((values, i) => ({ key: i, values })) : [{ key: 0, values: {} }],
  );
  const [nextKey, setNextKey] = useState(items.length);

  function addRow() {
    setItems((xs) => [...xs, { key: nextKey, values: {} }]);
    setNextKey(nextKey + 1);
  }

  // Spec: with a single row, [削除] empties it instead of removing it.
  function removeRow(key: number) {
    if (items.length === 1) {
      setItems([{ key: nextKey, values: {} }]);
      setNextKey(nextKey + 1);
    } else {
      setItems((xs) => xs.filter((x) => x.key !== key));
    }
  }

  // One datalist per option list used by a free-text column.
  const datalistKeys = [...new Set(section.fields.filter((f) => f.type === "text" && f.options).map((f) => f.options!))];
  const listId = (f: SectionField) => (f.type === "text" && f.options ? `${id}-${f.options}` : undefined);

  return (
    <div id={section.key} className="scroll-mt-20">
      <FormShell action={saveMemberSectionAction} confirmEmpty={false} submitLabel={`${section.title}を保存`}>
        <HiddenField name="individualId" value={individualId} />
        <HiddenField name="section" value={section.key} />
        <FieldGroup title={section.title} screenId={section.screenId} description={section.description}>
          <div className="sm:col-span-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-right">#</TableHead>
                  {section.fields.map((f) => (
                    <TableHead key={f.name}>
                      {f.label}
                      {f.required && <span className="text-destructive">*</span>}
                    </TableHead>
                  ))}
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.key} className="hover:bg-transparent">
                    <TableCell className="text-right align-top tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {section.fields.map((f) => (
                      <TableCell key={f.name} className="align-top">
                        <RowInput
                          name={`rows.${index}.${f.name}`}
                          field={f}
                          defaultValue={item.values[f.name] ?? ""}
                          options={f.type === "select" ? toOptions(lists[f.options!]) : undefined}
                          listId={listId(f)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="align-top">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(item.key)}>
                        <Trash2Icon />
                        削除
                      </Button>
                      <RowError name={`rows.${index}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-3">
              <PlusIcon />
              行を追加する
            </Button>
            {datalistKeys.map((key) => (
              <datalist key={key} id={`${id}-${key}`}>
                {toOptions(lists[key]).map((o) => (
                  <option key={o.value} value={o.value} />
                ))}
              </datalist>
            ))}
          </div>
        </FieldGroup>
      </FormShell>
    </div>
  );
}

function RowInput({
  name,
  field,
  defaultValue,
  options,
  listId,
}: {
  name: string;
  field: SectionField;
  defaultValue: string;
  options?: Option[];
  listId?: string;
}) {
  const error = useFieldError(name);
  const className = cn(controlClass, field.width ?? "w-40");
  return (
    <div className="flex flex-col gap-1">
      {field.type === "select" ? (
        <select name={name} defaultValue={defaultValue} aria-label={field.label} aria-invalid={!!error} className={className}>
          <option value="">選択してください</option>
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={field.type}
          defaultValue={defaultValue}
          list={listId}
          placeholder={listId ? "選択または入力" : undefined}
          maxLength={field.maxLength}
          min={field.min}
          max={field.max}
          aria-label={field.label}
          aria-invalid={!!error}
          className={className}
        />
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Errors the action reports for the whole row (`rows.<i>`). */
function RowError({ name }: { name: string }) {
  const error = useFieldError(name);
  if (!error) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-destructive">
      {error}
    </p>
  );
}
