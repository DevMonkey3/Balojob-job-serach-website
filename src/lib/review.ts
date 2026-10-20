// 審査 (staff review) vocabulary shared by the public site, the employer pages
// and the admin console. Safe for client components.

import type { Option } from "@/lib/admin/labels";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: "審査中",
  approved: "承認済",
  rejected: "差戻し",
};

export const reviewBadgeVariants: Record<ReviewStatus, BadgeVariant> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export const reviewFilterOptions: Option[] = [
  { value: "", label: "すべて" },
  { value: "pending", label: "審査中" },
  { value: "approved", label: "承認済" },
  { value: "rejected", label: "差戻し" },
];

/** A candidate profile that was never submitted is "draft". */
export type CandidateStatus = "draft" | ReviewStatus;

export const candidateStatusLabels: Record<CandidateStatus, string> = { draft: "未提出", ...reviewStatusLabels };

export const candidateStatusVariants: Record<CandidateStatus, BadgeVariant> = { draft: "outline", ...reviewBadgeVariants };

export const candidateFilterOptions: Option[] = [...reviewFilterOptions, { value: "draft", label: "未提出" }];

/** What an employer sees for one of their jobs: 非公開 beats everything else. */
export function jobPublicStatus(job: { reviewStatus: ReviewStatus; isActive: boolean }): { label: string; variant: BadgeVariant } {
  if (!job.isActive) return { label: "非公開", variant: "outline" };
  if (job.reviewStatus === "approved") return { label: "掲載中", variant: "default" };
  return { label: reviewStatusLabels[job.reviewStatus], variant: reviewBadgeVariants[job.reviewStatus] };
}

/** Application status wording for the candidate (My Page). */
export const applicationStatusForCandidate: Record<ReviewStatus, string> = {
  pending: "審査中",
  approved: "企業に紹介されました",
  rejected: "差戻し",
};
