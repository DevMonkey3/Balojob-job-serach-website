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
  idStr,
  int,
  parseForm,
  parseId,
  str,
  type ActionState,
  redirectTarget,
} from "@/server/admin/form";
import { findCorporationByMemberNo } from "@/server/admin/jobs";
import {
  createRecruitment,
  deleteRecruitment,
  getRecruitment,
  updateRecruitment,
} from "@/server/admin/recruitments";

const recruitmentSchema = z.object({
  id: idStr.optional(),
  memberNo: str(12),
  faculty: str(120),
  department: str(120),
  schoolGender: str(20),
  location: str(120),
  capacity: int(0, 99_999),
  annualTuition: int(0, 99_999_999),
  contactPerson: str(80),
  contactEmail: emailStr,
  notes: str(300),
  isActive: bool,
});

/** BHALO156 [登録]: creates when there is no id, otherwise updates. */
export async function saveRecruitmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("edit");

  const parsed = parseForm(recruitmentSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { id, memberNo, ...input } = parsed.data;

  let recruitmentId: bigint;
  if (id) {
    recruitmentId = BigInt(id);
    if (!(await getRecruitment(recruitmentId))) return { message: "対象データがありません。" };
    await updateRecruitment(recruitmentId, input);
    await audit(staff.id, "update", "recruitments", recruitmentId);
  } else {
    if (!memberNo) return { errors: { memberNo: "法人会員番号が入力されていません" }, message: INVALID_INPUT };
    // ERR0001: the member number must belong to a school.
    const corporation = await findCorporationByMemberNo(memberNo);
    if (!corporation || corporation.kind !== "school") {
      return {
        errors: { memberNo: "学校の法人会員情報が登録されていません。再入力してください。" },
        message: INVALID_INPUT,
      };
    }
    recruitmentId = await createRecruitment(corporation.id, input);
    await audit(staff.id, "create", "recruitments", recruitmentId);
  }

  updateTag("listings");
  redirect(`/admin/recruitments/${recruitmentId}?saved=${id ? "1" : "created"}`);
}

/** BHALO809 [削除]. */
export async function deleteRecruitmentAction(formData: FormData) {
  const staff = await requireStaffForAction("delete");
  const id = parseId(String(formData.get("id") ?? ""));
  if (!id) return;
  await deleteRecruitment(id);
  await audit(staff.id, "delete", "recruitments", id);
  updateTag("listings");
  revalidatePath("/admin/recruitments");
  const to = redirectTarget(formData);
  if (to) redirect(to);
}
