"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireEmployer } from "@/server/auth/member";
import {
  INVALID_INPUT,
  bool,
  emailStr,
  enumOf,
  idStr,
  int,
  parseForm,
  parseId,
  reqStr,
  str,
  timeStr,
  type ActionState,
} from "@/server/admin/form";
import { createMyJob, getMyCompany, setMyJobActive, updateMyCompany, updateMyJob } from "@/server/member/employer";

// Employer page: company info (BHALO111–114 fields) and job postings (BHALO116).

const companySchema = z.object({
  name: reqStr("会社・団体名", 120),
  nameKana: str(120),
  founded: str(50),
  representative: reqStr("代表者名", 80),
  capitalManYen: int(0, 2_000_000_000),
  headcount: int(0, 2_000_000_000),
  industry: str(120),
  url: str(200),
  postalCode: str(20),
  prefecture: str(50),
  city: str(50),
  town: str(50),
  addressLine: str(50),
  contactPerson: str(80),
  phone: str(20),
  contactEmail: emailStr,
  introduction: str(4000),
  isCompany: bool,
  isSupervisingOrg: bool,
  isRegisteredSupportOrg: bool,
});

export async function saveMyCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireEmployer();
  const parsed = parseForm(companySchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };

  const current = await getMyCompany(BigInt(member.corporationId));
  if (!current) return { message: "対象データがありません。" };
  await updateMyCompany(current, parsed.data);

  updateTag("listings");
  redirect("/employer?saved=1");
}

const jobSchema = z.object({
  id: idStr.optional(),
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

/** 求人情報 [保存]: creates or updates the employer's own job; either way it waits for staff review. */
export async function saveMyJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireEmployer();
  const corporationId = BigInt(member.corporationId);

  const parsed = parseForm(jobSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { id, track, ...rest } = parsed.data;
  if (!track) return { errors: { track: "種別が選択されていません" }, message: INVALID_INPUT };
  const input = { track, ...rest };

  let jobId: bigint;
  if (id) {
    jobId = BigInt(id);
    if (!(await updateMyJob(corporationId, jobId, input))) return { message: "対象データがありません。" };
  } else {
    jobId = await createMyJob(corporationId, input);
  }

  updateTag("listings");
  revalidatePath("/admin/reviews");
  redirect(`/employer/jobs/${jobId}?saved=${id ? "resubmitted" : "submitted"}`);
}

/** 公開 / 非公開 without going through review again. */
export async function setMyJobActiveAction(formData: FormData) {
  const member = await requireEmployer();
  const jobId = parseId(String(formData.get("id") ?? ""));
  if (!jobId) return;
  await setMyJobActive(BigInt(member.corporationId), jobId, formData.get("active") === "1");
  updateTag("listings");
  revalidatePath("/employer/jobs");
}
