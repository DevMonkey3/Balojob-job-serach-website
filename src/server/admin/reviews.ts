import "server-only";
import type { JobTrack, ReviewStatus } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { jobTrackLabels, schoolCategoryLabels } from "@/lib/format";

// 審査 (approval queues). Jobs, candidate profiles and applications submitted by
// members wait here until staff approve or reject them.

export type ReviewTarget = "job" | "candidate" | "application";

export type PendingCounts = { jobs: number; candidates: number; applications: number };

const pendingCandidate = { reviewStatus: "pending", submittedAt: { not: null } } as const;

export async function getPendingCounts(): Promise<PendingCounts> {
  const [jobs, candidates, applications] = await Promise.all([
    db.jobPosting.count({ where: { reviewStatus: "pending" } }),
    db.individual.count({ where: pendingCandidate }),
    db.application.count({ where: { reviewStatus: "pending" } }),
  ]);
  return { jobs, candidates, applications };
}

const QUEUE_LIMIT = 200;

export type PendingJobRow = {
  id: string;
  jobNo: number;
  corporationId: string;
  memberNo: string;
  company: string;
  track: JobTrack;
  category: string;
  industry: string;
  jobType: string;
  location: string;
  monthlySalary: number | null;
  submittedAt: Date | null;
};

export async function listPendingJobs(): Promise<PendingJobRow[]> {
  const rows = await db.jobPosting.findMany({
    where: { reviewStatus: "pending" },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: QUEUE_LIMIT,
    select: {
      id: true,
      jobNo: true,
      track: true,
      industry: true,
      jobType: true,
      location: true,
      monthlySalary: true,
      submittedAt: true,
      corporation: { select: { id: true, memberNo: true, name: true } },
    },
  });
  return rows.map((j) => ({
    id: String(j.id),
    jobNo: j.jobNo,
    corporationId: String(j.corporation.id),
    memberNo: j.corporation.memberNo,
    company: j.corporation.name,
    track: j.track,
    category: jobTrackLabels[j.track],
    industry: j.industry ?? "",
    jobType: j.jobType ?? "",
    location: j.location ?? "",
    monthlySalary: j.monthlySalary,
    submittedAt: j.submittedAt,
  }));
}

export type PendingCandidateRow = {
  id: string;
  memberNo: string;
  fullName: string;
  nationality: string;
  goals: string[];
  hasResumeFile: boolean;
  submittedAt: Date | null;
};

export async function listPendingCandidates(): Promise<PendingCandidateRow[]> {
  const rows = await db.individual.findMany({
    where: pendingCandidate,
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: QUEUE_LIMIT,
    select: {
      id: true,
      memberNo: true,
      fullName: true,
      nationality: true,
      resumeFileId: true,
      submittedAt: true,
      wantsEngineer: true,
      wantsSsw: true,
      wantsTitp: true,
      wantsUniversity: true,
      wantsVocational: true,
      wantsLanguageSchool: true,
    },
  });
  return rows.map((i) => ({
    id: String(i.id),
    memberNo: i.memberNo,
    fullName: i.fullName,
    nationality: i.nationality ?? "",
    goals: [
      i.wantsEngineer && jobTrackLabels.engineer,
      i.wantsSsw && jobTrackLabels.ssw,
      i.wantsTitp && jobTrackLabels.titp,
      i.wantsUniversity && schoolCategoryLabels.university,
      i.wantsVocational && schoolCategoryLabels.vocational,
      i.wantsLanguageSchool && schoolCategoryLabels.language_school,
    ].filter((g) => g !== false),
    hasResumeFile: !!i.resumeFileId,
    submittedAt: i.submittedAt,
  }));
}

export type PendingApplicationRow = {
  id: string;
  individual: { id: string; memberNo: string; fullName: string; reviewStatus: ReviewStatus; submitted: boolean };
  job: { id: string; company: string; jobType: string; jobNo: number } | null;
  targetLabel: string;
  submittedAt: Date | null;
};

export async function listPendingApplications(): Promise<PendingApplicationRow[]> {
  const rows = await db.application.findMany({
    where: { reviewStatus: "pending" },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: QUEUE_LIMIT,
    select: {
      id: true,
      submittedAt: true,
      createdAt: true,
      individual: { select: { id: true, memberNo: true, fullName: true, reviewStatus: true, submittedAt: true } },
      jobPosting: { select: { id: true, jobNo: true, jobType: true, corporation: { select: { name: true } } } },
      items: { select: { targetLabel: true }, orderBy: { id: "asc" }, take: 1 },
    },
  });
  return rows.map((a) => ({
    id: String(a.id),
    individual: {
      id: String(a.individual.id),
      memberNo: a.individual.memberNo,
      fullName: a.individual.fullName,
      reviewStatus: a.individual.reviewStatus,
      submitted: a.individual.submittedAt !== null,
    },
    job: a.jobPosting
      ? { id: String(a.jobPosting.id), company: a.jobPosting.corporation.name, jobType: a.jobPosting.jobType ?? "", jobNo: a.jobPosting.jobNo }
      : null,
    targetLabel: a.items[0]?.targetLabel ?? "",
    submittedAt: a.submittedAt ?? a.createdAt,
  }));
}

export type ReviewDecision = { status: "approved" | "rejected"; staffUserId: string; reason?: string };

/** Records the decision. Returns false when the row doesn't exist. */
export async function setReview(target: ReviewTarget, id: bigint, decision: ReviewDecision): Promise<boolean> {
  const data = {
    reviewStatus: decision.status,
    reviewedAt: new Date(),
    reviewedById: decision.staffUserId,
    rejectionReason: decision.status === "rejected" ? (decision.reason ?? null) : null,
  };
  const where = { id };
  const result =
    target === "job"
      ? await db.jobPosting.updateMany({ where, data })
      : target === "candidate"
        ? await db.individual.updateMany({ where, data })
        : await db.application.updateMany({ where, data });
  return result.count > 0;
}

export const reviewTargetTable: Record<ReviewTarget, string> = {
  job: "job_postings",
  candidate: "individuals",
  application: "applications",
};
