"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { PASSWORD_MIN_LENGTH } from "@/server/auth/password";
import { requireStaffForAction } from "@/server/auth/staff";
import { audit } from "@/server/admin/audit";
import { INVALID_INPUT, bool, emailStr, parseForm, redirectTarget, reqStr, str, type ActionState } from "@/server/admin/form";
import {
  createStaffUser,
  deleteStaffUser,
  getStaffUser,
  parseUuid,
  updateStaffUser,
} from "@/server/admin/staff-users";

const NOT_FOUND = "対象データがありません。";

const userSchema = z.object({
  id: str(36),
  name: reqStr("ユーザ名", 80),
  email: emailStr,
  password: str(200),
  confirm: str(200),
  isAdmin: bool,
  canView: bool,
  canEdit: bool,
  canDelete: bool,
  // The screen shows 非アクティブ; users.isActive is the inverse.
  inactive: bool,
});

/** BHALO811 [更新]: creates when there is no id, otherwise updates. */
export async function saveStaffUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("admin");

  const parsed = parseForm(userSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { id: rawId, email, password, confirm, name, inactive, ...permissions } = parsed.data;
  const input = { name, isActive: !inactive, ...permissions };

  // Checks that need more than one field. A blank password on edit means "unchanged".
  const errors: Record<string, string> = {};
  if (password !== undefined && password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください`;
  }
  if (password !== undefined && password !== confirm) errors.confirm = "パスワードが一致しません";

  if (rawId) {
    const id = parseUuid(rawId);
    if (!id || !(await getStaffUser(id))) return { message: NOT_FOUND };
    // Administrators cannot lock themselves out.
    if (id === staff.id && !input.isAdmin) errors.isAdmin = "自分自身のAdministrator権限は外せません";
    if (id === staff.id && inactive) errors.inactive = "自分自身を非アクティブにはできません";
    if (Object.keys(errors).length > 0) return { errors, message: INVALID_INPUT };

    await updateStaffUser(id, input, password, id === staff.id);
    await audit(staff.id, "update", "users", id, { passwordChanged: password !== undefined });
    redirect("/admin/users?saved=1");
  }

  if (!email) errors.email = "ログインID（メールアドレス）が入力されていません";
  if (!password) errors.password = "パスワードが入力されていません";
  if (Object.keys(errors).length > 0 || !email || !password) return { errors, message: INVALID_INPUT };

  let userId: string;
  try {
    userId = await createStaffUser(email, password, input);
  } catch (e) {
    // Spec: 新規登録時、登録済みの場合は再入力とする.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { email: "このメールアドレスは既に登録されています" }, message: INVALID_INPUT };
    }
    throw e;
  }
  await audit(staff.id, "create", "users", userId);
  redirect("/admin/users?saved=created");
}

/** BHALO810 [削除]. The signed-in user cannot delete their own account. */
export async function deleteStaffUserAction(formData: FormData) {
  const staff = await requireStaffForAction("admin");
  const id = parseUuid(String(formData.get("id") ?? ""));
  if (!id || id === staff.id) return;
  if (!(await getStaffUser(id))) return;
  await deleteStaffUser(id);
  await audit(staff.id, "delete", "users", id);
  revalidatePath("/admin/users");
  const to = redirectTarget(formData);
  if (to) redirect(to);
}
