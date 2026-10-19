"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireCandidate } from "@/server/auth/member";
import { parseId, type ActionState } from "@/server/admin/form";
import { createApplication, findOpenJob } from "@/server/member/candidate";

// My Page [応募する]: one application per job, reviewed by staff before the
// employer sees it. Candidates may apply before their own profile is approved;
// staff see the profile status next to the application in the queue.

export async function applyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireCandidate();
  const jobId = parseId(String(formData.get("jobId") ?? ""));
  if (!jobId) return { message: "対象データがありません。" };

  const job = await findOpenJob(jobId);
  if (!job) return { message: "この求人は現在応募できません。" };

  try {
    await createApplication(BigInt(member.individualId), {
      id: job.id,
      company: job.corporation.name,
      jobType: job.jobType,
      workName: job.workName,
      track: job.track,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { message: "この求人にはすでに応募済みです。" };
    }
    throw e;
  }

  revalidatePath("/mypage");
  revalidatePath("/admin/reviews");
  return { ok: true, message: "応募しました。スタッフの確認後、企業に紹介されます。" };
}
