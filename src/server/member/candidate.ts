import "server-only";
import type { ApplicationStatus, ReviewStatus } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { jobTrackLabels } from "@/lib/format";

// A candidate's own applications (BHALO200 コンタクト申込 → one application per job).

export type MyApplicationRow = {
  id: string;
  jobId: string | null;
  /** Snapshot of the job at the time of applying. */
  targetLabel: string;
  company: string;
  jobType: string;
  category: string;
  location: string;
  appliedAt: Date;
  reviewStatus: ReviewStatus;
  rejectionReason: string;
  staffStatus: ApplicationStatus;
};

export async function listMyApplications(individualId: bigint): Promise<MyApplicationRow[]> {
  const rows = await db.application.findMany({
    where: { individualId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      jobPosting: { select: { id: true, track: true, jobType: true, location: true, corporation: { select: { name: true } } } },
      items: { select: { targetLabel: true }, orderBy: { id: "asc" }, take: 1 },
    },
  });
  return rows.map((a) => ({
    id: String(a.id),
    jobId: a.jobPosting ? String(a.jobPosting.id) : null,
    targetLabel: a.items[0]?.targetLabel ?? "",
    company: a.jobPosting?.corporation.name ?? "",
    jobType: a.jobPosting?.jobType ?? "",
    category: a.jobPosting ? jobTrackLabels[a.jobPosting.track] : "",
    location: a.jobPosting?.location ?? "",
    appliedAt: a.submittedAt ?? a.createdAt,
    reviewStatus: a.reviewStatus,
    rejectionReason: a.rejectionReason ?? "",
    staffStatus: a.status,
  }));
}

/** Ids (as strings) of the jobs this candidate already applied to, for the apply buttons. */
export async function appliedJobIds(individualId: bigint): Promise<string[]> {
  const rows = await db.application.findMany({
    where: { individualId, jobPostingId: { not: null } },
    select: { jobPostingId: true },
  });
  return rows.map((r) => String(r.jobPostingId));
}

/** A job the candidate may apply to: approved, active, with an active company. */
export async function findOpenJob(jobId: bigint) {
  return db.jobPosting.findFirst({
    where: { id: jobId, isActive: true, reviewStatus: "approved", corporation: { isActive: true } },
    select: { id: true, track: true, jobType: true, workName: true, corporation: { select: { name: true } } },
  });
}

/** Creates the application (pending staff review) with its one item. Throws P2002 when it already exists. */
export async function createApplication(
  individualId: bigint,
  job: { id: bigint; company: string; jobType: string | null; workName: string | null; track: keyof typeof jobTrackLabels },
): Promise<bigint> {
  const targetLabel = `${job.company} / ${job.jobType || job.workName || jobTrackLabels[job.track]}`.slice(0, 300);
  const created = await db.application.create({
    data: {
      individualId,
      jobPostingId: job.id,
      reviewStatus: "pending",
      submittedAt: new Date(),
      items: { create: { jobPostingId: job.id, targetLabel } },
    },
    select: { id: true },
  });
  return created.id;
}
