"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffForAction } from "@/server/auth/staff";
import { audit } from "@/server/admin/audit";
import { parseId, redirectTarget } from "@/server/admin/form";
import { reviewTargetTable, setReview, type ReviewTarget } from "@/server/admin/reviews";

// [承認] / [差戻し] on the review queues and the detail pages. Form fields:
// target (job | candidate | application), id, reason (差戻し only), redirectTo.

const TARGETS: readonly ReviewTarget[] = ["job", "candidate", "application"];

function readTarget(formData: FormData): { target: ReviewTarget; id: bigint } | null {
  const target = String(formData.get("target") ?? "");
  const id = parseId(String(formData.get("id") ?? ""));
  if (!(TARGETS as readonly string[]).includes(target) || !id) return null;
  return { target: target as ReviewTarget, id };
}

const listPath: Record<ReviewTarget, string> = {
  job: "/admin/jobs",
  candidate: "/admin/members",
  application: "/admin/applications",
};

async function decide(formData: FormData, status: "approved" | "rejected") {
  const staff = await requireStaffForAction("edit");
  const parsed = readTarget(formData);
  if (!parsed) return;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  // A rejection without a reason would leave the member guessing; the form requires one.
  if (status === "rejected" && !reason) return;

  const changed = await setReview(parsed.target, parsed.id, { status, staffUserId: staff.id, reason });
  if (!changed) return;

  await audit(staff.id, status === "approved" ? "approve" : "reject", reviewTargetTable[parsed.target], parsed.id, reason ? { reason } : undefined);
  if (parsed.target === "job") updateTag("listings");
  revalidatePath("/admin/reviews");
  revalidatePath(listPath[parsed.target]);
  revalidatePath("/mypage");
  revalidatePath("/employer/jobs");

  redirect(redirectTarget(formData) ?? `/admin/reviews?saved=${status}`);
}

export async function approveAction(formData: FormData) {
  await decide(formData, "approved");
}

export async function rejectAction(formData: FormData) {
  await decide(formData, "rejected");
}
