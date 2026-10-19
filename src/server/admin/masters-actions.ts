"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaffForAction } from "@/server/auth/staff";
import { audit } from "@/server/admin/audit";
import {
  INVALID_INPUT,
  bool,
  emailStr,
  enumOf,
  idStr,
  int,
  parseForm,
  reqStr,
  str,
  type ActionState,
} from "@/server/admin/form";
import {
  CATEGORY_RE,
  SEQUENCES,
  SEQUENCE_MAX,
  deleteUser,
  getLogin,
  getOptionParent,
  saveIndustryRows,
  saveOptionRows,
  saveSiteSettings,
  setSequenceNext,
  setUserActive,
} from "@/server/admin/masters";
import { parseUuid } from "@/server/admin/staff-users";

const NOT_FOUND = "対象データがありません。";
const STALE = "他のユーザが同じデータを変更しました。画面を再読み込みしてください。";

// --- Row editors (BHALO812, 815) -----------------------------------------------
// The editors post the same field names once per row, which parseForm turns
// into one array per column. A single row arrives as a plain string.

const list = z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(z.string()));

/** The id of a row: "" for one that is not saved yet. */
const rowId = z.preprocess((v) => (v === "" ? undefined : v), idStr.optional());

type ParsedRows<S extends z.ZodType> =
  | { rows: z.output<S>[]; errors?: undefined }
  | { rows?: undefined; errors: Record<string, string> };

/**
 * Zips the column arrays into rows and validates each one with `row`. Errors
 * are keyed `<index>.<field>` so the editor can show them next to the cell.
 */
function parseRows<S extends z.ZodType>(row: S, columns: Record<string, string[]>): ParsedRows<S> {
  const count = columns.id.length;
  if (Object.values(columns).some((c) => c.length !== count)) {
    return { errors: { _: "行の内容を読み取れませんでした。画面を再読み込みしてください。" } };
  }
  const raw = Array.from({ length: count }, (_, i) =>
    Object.fromEntries(Object.entries(columns).map(([name, values]) => [name, values[i]])),
  );
  const result = z.array(row).safeParse(raw);
  if (result.success) return { rows: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { errors };
}

const optionsFormSchema = z.object({
  category: z.string().regex(CATEGORY_RE, "カテゴリ名が不正です"),
  parentId: rowId,
  id: list,
  labelJa: list,
  labelEn: list,
  labelBn: list,
  sortOrder: list,
  isActive: list,
});

const optionRowSchema = z.object({
  id: rowId,
  labelJa: reqStr("日本語名", 120),
  labelEn: str(120),
  labelBn: str(120),
  sortOrder: int(-32768, 32767),
  isActive: bool,
});

/** BHALO812 [更新]: one level (level 1, or the children of one parent) of one category. */
export async function saveOptionsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("admin");

  const form = parseForm(optionsFormSchema, formData);
  if (form.errors) return { errors: form.errors, message: INVALID_INPUT };
  const { category, parentId: rawParentId, ...columns } = form.data;
  const parsed = parseRows(optionRowSchema, columns);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };

  const parentId = rawParentId ? BigInt(rawParentId) : null;
  if (parentId && !(await getOptionParent(category, parentId))) return { message: NOT_FOUND };

  const result = await saveOptionRows(category, parentId, parsed.rows);
  if (!result) return { message: STALE };
  await audit(staff.id, "update", "selection_options", parentId ?? category, { category, parentId: rawParentId ?? null, ...result });

  const q = new URLSearchParams({ category });
  if (rawParentId) q.set("parent", rawParentId);
  q.set("saved", "1");
  redirect(`/admin/masters/options?${q}`);
}

const industriesFormSchema = z.object({ id: list, labelJa: list, labelEn: list, sortOrder: list });

const industryRowSchema = z.object({
  id: rowId,
  labelJa: reqStr("日本語名", 60),
  labelEn: str(120),
  sortOrder: int(-32768, 32767),
});

/** BHALO815 [更新]. */
export async function saveIndustriesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("admin");

  const form = parseForm(industriesFormSchema, formData);
  if (form.errors) return { errors: form.errors, message: INVALID_INPUT };
  const parsed = parseRows(industryRowSchema, form.data);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };

  const result = await saveIndustryRows(parsed.rows);
  if (!result) return { message: STALE };
  await audit(staff.id, "update", "popular_industries", "all", result);

  updateTag("popular-industries");
  redirect("/admin/masters/industries?saved=1");
}

// --- ログインマスタメンテ (BHALO813) --------------------------------------------

/** 非アクティブにする / アクティブにする. Administrators cannot deactivate themselves. */
export async function toggleUserActiveAction(formData: FormData) {
  const staff = await requireStaffForAction("admin");
  const id = parseUuid(String(formData.get("id") ?? ""));
  const active = formData.get("active") === "1";
  if (!id || (id === staff.id && !active)) return;
  if (!(await getLogin(id))) return;
  await setUserActive(id, active);
  await audit(staff.id, "update", "users", id, { isActive: active });
  revalidatePath("/admin/masters/logins");
}

/** BHALO813 [削除]: the login and everything that hangs off it. */
export async function deleteLoginAction(formData: FormData) {
  const staff = await requireStaffForAction("admin");
  const id = parseUuid(String(formData.get("id") ?? ""));
  if (!id || id === staff.id) return;
  const user = await getLogin(id);
  if (!user) return;
  await deleteUser(id);
  await audit(staff.id, "delete", "users", id, { accountType: user.accountType });
  // A deleted company or school takes its postings off the site.
  if (user.accountType === "corporate") updateTag("listings");
  revalidatePath("/admin/masters/logins");
}

// --- 採番マスタメンテ (BHALO814) -----------------------------------------------

const sequenceSchema = z.object({
  sequence: enumOf(SEQUENCES),
  value: int(1, SEQUENCE_MAX),
});

/** BHALO814 [更新]: moves a member-number sequence forward. */
export async function setSequenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("admin");

  const parsed = parseForm(sequenceSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { sequence, value } = parsed.data;
  if (!sequence) return { message: NOT_FOUND };
  if (value === undefined) return { errors: { value: "次の採番値が入力されていません" }, message: INVALID_INPUT };

  const result = await setSequenceNext(sequence, value);
  if (!result) return { errors: { value: "現在値より大きい値を入力してください" }, message: INVALID_INPUT };
  await audit(staff.id, "update", "sequences", sequence, { from: result.from, to: value });

  redirect("/admin/masters/numbering?saved=1");
}

// --- 管理マスタメンテ (BHALO816) -----------------------------------------------

const requiredEmail = (label: string) => emailStr.pipe(z.string({ error: `${label}が入力されていません` }));

const settingsSchema = z.object({
  application_email_individual: requiredEmail("個人申込メールアドレス"),
  application_email_corporate: requiredEmail("法人申込メールアドレス"),
});

/** BHALO816 [更新]. */
export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("admin");

  const parsed = parseForm(settingsSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };

  await saveSiteSettings(parsed.data);
  for (const key of Object.keys(parsed.data)) await audit(staff.id, "update", "site_settings", key);

  redirect("/admin/masters/settings?saved=1");
}
