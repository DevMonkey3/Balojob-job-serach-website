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
  parseId,
  str,
  timeStr,
  type ActionState,
  redirectTarget,
} from "@/server/admin/form";
import {
  createJob,
  deleteJob,
  findCorporationByMemberNo,
  getJob,
  saveJobOrder,
  updateJob,
} from "@/server/admin/jobs";

const jobSchema = z.object({
  id: idStr.optional(),
  memberNo: str(12),
  track: enumOf(["engineer", "ssw", "titp"]),
  industry: str(120),
  jobType: str(120),
  workName: str(120),
  employmentType: str(120),
  description: str(1000),
  location: str(120),
  hoursFrom: timeStr,
  hoursTo: timeStr,
  holidays: str(120),
  monthlySalary: int(0, 99_999_999),
  contactPerson: str(80),
  contactEmail: emailStr,
  features: str(1000),
  isActive: bool,
});

/** BHALO802 [更新]: creates when there is no id, otherwise updates. */
export async function saveJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("edit");

  const parsed = parseForm(jobSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { id, memberNo, track, ...rest } = parsed.data;
  if (!track) return { errors: { track: "種別が選択されていません" }, message: INVALID_INPUT };
  const input = { track, ...rest };

  let jobId: bigint;
  if (id) {
    jobId = BigInt(id);
    if (!(await getJob(jobId))) return { message: "対象データがありません。" };
    await updateJob(jobId, input);
    await audit(staff.id, "update", "job_postings", jobId);
  } else {
    if (!memberNo) return { errors: { memberNo: "法人会員番号が入力されていません" }, message: INVALID_INPUT };
    // ERR0001: the company must exist.
    const corporation = await findCorporationByMemberNo(memberNo);
    if (!corporation) {
      return { errors: { memberNo: "法人会員情報が登録されていません。再入力してください。" }, message: INVALID_INPUT };
    }
    // Entered by staff, so it needs no review.
    const now = new Date();
    jobId = await createJob(corporation.id, input, {
      reviewStatus: "approved",
      submittedAt: now,
      reviewedAt: now,
      reviewedById: staff.id,
    });
    await audit(staff.id, "create", "job_postings", jobId);
  }

  updateTag("listings");
  redirect(`/admin/jobs/${jobId}?saved=${id ? "1" : "created"}`);
}

/** BHALO801 [削除]. */
export async function deleteJobAction(formData: FormData) {
  const staff = await requireStaffForAction("delete");
  const id = parseId(String(formData.get("id") ?? ""));
  if (!id) return;
  await deleteJob(id);
  await audit(staff.id, "delete", "job_postings", id);
  updateTag("listings");
  revalidatePath("/admin/jobs");
  const to = redirectTarget(formData);
  if (to) redirect(to);
}

const jobOrderSchema = z.object({
  jobId: idStr,
  dailyWorkingTime: timeStr,
  overtimeDailyHours: int(0, 24),
  overtimeMonthlyAvgHours: int(0, 744),
  breakTime: str(120),
  avgWorkDaysPerMonth: int(0, 31),
  annualWorkHours: int(0, 8784),
  weeklyWorkDays: str(120),
  hasEmploymentInsurance: bool,
  hasWorkersComp: bool,
  hasHealthInsurance: bool,
  hasPension: bool,
  commuteFull: bool,
  commuteFixed: bool,
  japaneseLevel: str(120),
});

/** BHALO117 求人票 for one posting. */
export async function saveJobOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("edit");

  const parsed = parseForm(jobOrderSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { jobId, ...input } = parsed.data;

  const id = BigInt(jobId);
  if (!(await getJob(id))) return { message: "対象データがありません。" };
  await saveJobOrder(id, input);
  await audit(staff.id, "update", "job_orders", id);

  redirect(`/admin/jobs/${id}?saved=1#job-order`);
}
