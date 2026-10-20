import "server-only";
import { z } from "zod";

// Helpers for server actions that take a <form>: zod field types that accept
// what browsers send (strings, "on" for checkboxes, "" for empty), and a
// parser that turns zod issues into { fieldName: message }.

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export const initialActionState: ActionState = {};

const trim = (v: unknown) => {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s === "" ? undefined : s;
};

/** Optional text. Empty → undefined. */
export const str = (max = 300) =>
  z.preprocess(trim, z.string().max(max, `${max}文字以内で入力してください`).optional());

/** Required text. */
export const reqStr = (label: string, max = 300) =>
  z.preprocess(
    trim,
    z
      .string({ error: `${label}が入力されていません` })
      .min(1, `${label}が入力されていません`)
      .max(max, `${max}文字以内で入力してください`),
  );

/** Optional whole number. */
export const int = (min = 0, max = 2_000_000_000) =>
  z.preprocess(
    (v) => {
      const s = trim(v);
      if (s === undefined) return undefined;
      return /^-?\d+$/.test(s) ? Number(s) : NaN;
    },
    z
      .number({ error: "整数で入力してください" })
      .int("整数で入力してください")
      .min(min, `${min}以上で入力してください`)
      .max(max, `${max}以下で入力してください`)
      .optional(),
  );

/** Optional decimal, e.g. 身長 170.5. */
export const decimal = (min = 0, max = 999) =>
  z.preprocess(
    (v) => {
      const s = trim(v);
      if (s === undefined) return undefined;
      return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
    },
    z
      .number({ error: "数値で入力してください" })
      .min(min, `${min}以上で入力してください`)
      .max(max, `${max}以下で入力してください`)
      .optional(),
  );

/** Checkbox: present ("on"/"1"/"true") → true, absent → false. */
export const bool = z.preprocess((v) => v === "on" || v === "1" || v === "true", z.boolean());

/** Optional yes/no radio: "1" → true, "0" → false, "" → undefined. */
export const yesNo = z.preprocess(
  (v) => {
    const s = trim(v);
    return s === undefined ? undefined : s === "1";
  },
  z.boolean().optional(),
);

/** <input type="date">: YYYY-MM-DD. */
export const dateStr = z.preprocess(trim, z.iso.date("日付の形式が正しくありません").optional());

/** <input type="month">: YYYY-MM. */
export const monthStr = z.preprocess(
  trim,
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "年月の形式が正しくありません").optional(),
);

/** <input type="time">: HH:MM. */
export const timeStr = z.preprocess(
  trim,
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "hh:mm形式で入力してください").optional(),
);

export const emailStr = z.preprocess(
  trim,
  z.email("メールアドレスの形式が正しくありません").max(254, "254文字以内で入力してください").optional(),
);

export const enumOf = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(trim, z.enum(values).optional());

/** A record id from a hidden field or a URL segment. */
export const idStr = z.string().regex(/^\d{1,18}$/, "IDが不正です");

export function parseId(value: string | undefined): bigint | null {
  return value && /^\d{1,18}$/.test(value) ? BigInt(value) : null;
}

export type Parsed<S extends z.ZodType> =
  | { data: z.output<S>; errors?: undefined }
  | { data?: undefined; errors: Record<string, string> };

/** Parses a FormData with a zod object. Repeated names (checkbox groups) become arrays. */
export function parseForm<S extends z.ZodType>(schema: S, formData: FormData): Parsed<S> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    // Next.js adds its own $ACTION_* fields.
    if (key.startsWith("$") || typeof value !== "string") continue;
    const existing = raw[key];
    if (existing === undefined) raw[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else raw[key] = [existing, value];
  }

  const result = schema.safeParse(raw);
  if (result.success) return { data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { errors };
}

export const INVALID_INPUT = "入力内容を確認してください。";

/**
 * Where a delete action should go afterwards: the `redirectTo` field that
 * DeleteButton adds on edit pages (so the user doesn't land on a 404), limited
 * to console paths. Undefined on list pages, which simply re-render.
 */
export function redirectTarget(formData: FormData): string | undefined {
  const to = formData.get("redirectTo");
  return typeof to === "string" && /^\/admin(\/[\w-]+)*(\?[\w=&-]*)?$/.test(to) ? to : undefined;
}

// --- Conversions between form strings and Prisma values ----------------------
// Prisma maps `date` and `time` columns to JS Dates in UTC.

export const toDate = (ymd: string | undefined) => (ymd ? new Date(`${ymd}T00:00:00Z`) : null);
export const fromDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/** Year + month stored as the 1st of the month. */
export const toMonth = (ym: string | undefined) => (ym ? new Date(`${ym}-01T00:00:00Z`) : null);
export const fromMonth = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 7) : "");

export const toTime = (hhmm: string | undefined) => (hhmm ? new Date(`1970-01-01T${hhmm}:00Z`) : null);
export const fromTime = (d: Date | null | undefined) => (d ? d.toISOString().slice(11, 16) : "");
