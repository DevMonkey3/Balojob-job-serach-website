import type { OptionKey } from "@/lib/options";

type FieldBase = {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  /** Grid columns the field spans on wide screens (1 or 2). */
  span?: 1 | 2;
};

export type Field = FieldBase &
  (
    | {
        type: "text" | "email" | "tel" | "date" | "number" | "url" | "time";
        placeholder?: string;
        suffix?: string;
        maxLength?: number;
      }
    | { type: "textarea"; rows?: number; maxLength?: number }
    /** Strict choice from the master list. */
    | { type: "select"; options: OptionKey }
    /** Choice from the master list, or free text when nothing fits ("選択 or 手入力"). */
    | { type: "combo"; options?: OptionKey }
    | { type: "radio"; options: OptionKey }
    /** Stored as `${name}Year` and `${name}Month`. */
    | { type: "yearMonth" }
    | { type: "file"; accept: string }
    | {
        type: "checkboxes";
        groups: { title: string; items: { name: string; label: string }[] }[];
      }
  );

export type FieldValue = string | boolean;
export type Values = Record<string, FieldValue>;
export type Row = Record<string, string>;

export type WizardData = {
  values: Record<string, Values>;
  rows: Record<string, Row[]>;
};

export type StepDef = {
  slug: string;
  /** Screen ID in the design documents (詳細設計書). */
  screenId: string;
  title: string;
  titleEn: string;
  description?: string;
  /** "form": one record. "rows": a list with add/delete row (言語, 学歴, …). */
  kind: "form" | "rows";
  fields: Field[];
  /** Label for one row, used on the add button. */
  rowLabel?: string;
  /** Skip the step unless this returns true (希望選択 driven steps). */
  when?: (data: WizardData) => boolean;
  /** Returns field name → message. Empty object means valid. */
  validate?: (values: Values) => Record<string, string>;
};

export type FlowDef = {
  id: string;
  title: string;
  basePath: string;
  steps: StepDef[];
  /** Where [もどる] on the first step goes. */
  startHref: string;
  finishHref: string;
  finishLabel: string;
};
