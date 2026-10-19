"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaffForAction } from "@/server/auth/staff";
import { deleteApplication, getApplication, updateApplication } from "@/server/admin/applications";
import { audit } from "@/server/admin/audit";
import { INVALID_INPUT, enumOf, idStr, parseForm, parseId, redirectTarget, str, type ActionState } from "@/server/admin/form";

const schema = z.object({
  id: idStr,
  status: enumOf(["new", "in_progress", "closed"]),
  staffNote: str(2000),
});

/** Status and staff memo of one contact request. */
export async function updateApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("edit");

  const parsed = parseForm(schema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { id, status, staffNote } = parsed.data;
  if (!status) return { errors: { status: "ステータスが選択されていません" }, message: INVALID_INPUT };

  const applicationId = BigInt(id);
  if (!(await getApplication(applicationId))) return { message: "対象データがありません。" };
  await updateApplication(applicationId, { status, staffNote });
  await audit(staff.id, "update", "applications", applicationId, { status });

  redirect(`/admin/applications/${applicationId}?saved=1`);
}

export async function deleteApplicationAction(formData: FormData) {
  const staff = await requireStaffForAction("delete");
  const id = parseId(String(formData.get("id") ?? ""));
  if (!id) return;
  await deleteApplication(id);
  await audit(staff.id, "delete", "applications", id);
  revalidatePath("/admin/applications");
  const to = redirectTarget(formData);
  if (to) redirect(to);
}
