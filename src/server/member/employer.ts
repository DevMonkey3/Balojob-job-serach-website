import "server-only";
import type { JobTrack, ReviewStatus } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { getCorporation, updateCorporation, type CorporationDetail, type CorporationInput } from "@/server/admin/corporations";
import { createJob, getJob, updateJob, type JobDetail, type JobInput } from "@/server/admin/jobs";
import { getMember as getMemberDetail, type MemberDetail } from "@/server/admin/members";

// The employer's own company, jobs and approved applicants. Every function
// takes the corporation id from the session, so an employer can only reach
// their own rows.

export type CompanyProfileInput = Omit<
  CorporationInput,
  "email" | "isActive" | "isUniversity" | "isVocationalSchool" | "isLanguageSchool"
>;

export async function getMyCompany(corporationId: bigint): Promise<CorporationDetail | null> {
  return getCorporation("company", corporationId);
}

/** The login email, active flag and school flags are not the employer's to change. */
export async function updateMyCompany(current: CorporationDetail, input: CompanyProfileInput) {
  const anyType = input.isCompany || input.isSupervisingOrg || input.isRegisteredSupportOrg;
  await updateCorporation(BigInt(current.id), {
    ...input,
    // The table requires at least one organisation type.
    isCompany: anyType ? input.isCompany : true,
    email: current.email,
    isActive: current.isActive,
    isUniversity: false,
    isVocationalSchool: false,
    isLanguageSchool: false,
  });
}

export type MyJobRow = {
  id: string;
  jobNo: number;
  track: JobTrack;
  industry: string;
  jobType: string;
  location: string;
  monthlySalary: number | null;
  isActive: boolean;
  reviewStatus: ReviewStatus;
  rejectionReason: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  approvedApplicants: number;
  createdAt: Date;
};

export async function listMyJobs(corporationId: bigint): Promise<MyJobRow[]> {
  const rows = await db.jobPosting.findMany({
    where: { corporationId },
    orderBy: [{ jobNo: "desc" }],
    select: {
      id: true,
      jobNo: true,
      track: true,
      industry: true,
      jobType: true,
      location: true,
      monthlySalary: true,
      isActive: true,
      reviewStatus: true,
      rejectionReason: true,
      submittedAt: true,
      reviewedAt: true,
      createdAt: true,
      _count: { select: { applications: { where: { reviewStatus: "approved" } } } },
    },
  });
  return rows.map((j) => ({
    id: String(j.id),
    jobNo: j.jobNo,
    track: j.track,
    industry: j.industry ?? "",
    jobType: j.jobType ?? "",
    location: j.location ?? "",
    monthlySalary: j.monthlySalary,
    isActive: j.isActive,
    reviewStatus: j.reviewStatus,
    rejectionReason: j.rejectionReason ?? "",
    submittedAt: j.submittedAt,
    reviewedAt: j.reviewedAt,
    approvedApplicants: j._count.applications,
    createdAt: j.createdAt,
  }));
}

/** One of the employer's jobs, or null when the id belongs to someone else. */
export async function getMyJob(corporationId: bigint, jobId: bigint): Promise<JobDetail | null> {
  const job = await getJob(jobId);
  return job && job.corporationId === String(corporationId) ? job : null;
}

/** New jobs wait for staff review. */
export async function createMyJob(corporationId: bigint, input: JobInput): Promise<bigint> {
  return createJob(corporationId, input, { reviewStatus: "pending", submittedAt: new Date() });
}

/** Any edit goes back to review, so an approved job leaves the site until it is approved again. */
export async function updateMyJob(corporationId: bigint, jobId: bigint, input: JobInput): Promise<boolean> {
  const owned = await db.jobPosting.findFirst({ where: { id: jobId, corporationId }, select: { id: true } });
  if (!owned) return false;
  await updateJob(jobId, input, {
    reviewStatus: "pending",
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedById: null,
    rejectionReason: null,
  });
  return true;
}

export async function setMyJobActive(corporationId: bigint, jobId: bigint, isActive: boolean): Promise<boolean> {
  const result = await db.jobPosting.updateMany({ where: { id: jobId, corporationId }, data: { isActive } });
  return result.count > 0;
}

export type ApplicantRow = {
  applicationId: string;
  appliedAt: Date;
  individualId: string;
  memberNo: string;
  fullName: string;
  nameKana: string;
  nationality: string;
  residenceCountry: string;
  japaneseLevel: string;
  desiredJob: string;
  hasResumeFile: boolean;
};

/** Applicants staff have approved for one of the employer's jobs (the hand-over, BHALO200). */
export async function listApprovedApplicants(corporationId: bigint, jobId: bigint): Promise<ApplicantRow[]> {
  const rows = await db.application.findMany({
    where: { jobPostingId: jobId, reviewStatus: "approved", jobPosting: { corporationId } },
    orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      submittedAt: true,
      createdAt: true,
      individual: {
        select: {
          id: true,
          memberNo: true,
          fullName: true,
          nameKana: true,
          nationality: true,
          residenceCountry: true,
          resumeFileId: true,
          languages: { where: { language: "日本語" }, take: 1, select: { level: true } },
          jobWishes: { orderBy: { sortOrder: "asc" }, take: 1, select: { desiredJob: true } },
        },
      },
    },
  });
  return rows.map((a) => ({
    applicationId: String(a.id),
    appliedAt: a.submittedAt ?? a.createdAt,
    individualId: String(a.individual.id),
    memberNo: a.individual.memberNo,
    fullName: a.individual.fullName,
    nameKana: a.individual.nameKana ?? "",
    nationality: a.individual.nationality ?? "",
    residenceCountry: a.individual.residenceCountry ?? "",
    japaneseLevel: a.individual.languages[0]?.level ?? "",
    desiredJob: a.individual.jobWishes[0]?.desiredJob ?? "",
    hasResumeFile: !!a.individual.resumeFileId,
  }));
}

export type ApprovedApplicant = {
  application: { id: string; appliedAt: Date };
  job: { id: string; jobNo: number; jobType: string };
  /** The 履歴書 data without what an employer must not see (APPI): login, passport, religion, allergies. */
  member: MemberDetail;
  files: { photoUrl: string | null; resumeUrl: string | null; resumeName: string | null };
};

export async function getApprovedApplicant(corporationId: bigint, applicationId: bigint): Promise<ApprovedApplicant | null> {
  const a = await db.application.findFirst({
    where: { id: applicationId, reviewStatus: "approved", jobPosting: { corporationId } },
    select: {
      id: true,
      submittedAt: true,
      createdAt: true,
      jobPosting: { select: { id: true, jobNo: true, jobType: true } },
      individual: { select: { id: true, photoFileId: true, resumeFileId: true, resumeFile: { select: { originalName: true } } } },
    },
  });
  if (!a || !a.jobPosting) return null;

  const detail = await getMemberDetail(a.individual.id);
  if (!detail) return null;
  const member: MemberDetail = {
    ...detail,
    email: "",
    resume: detail.resume
      ? { ...detail.resume, passportMasked: "", religion: "", allergies: "", sensitiveConsentAt: null }
      : null,
  };

  return {
    application: { id: String(a.id), appliedAt: a.submittedAt ?? a.createdAt },
    job: { id: String(a.jobPosting.id), jobNo: a.jobPosting.jobNo, jobType: a.jobPosting.jobType ?? "" },
    member,
    files: {
      photoUrl: a.individual.photoFileId ? `/api/files/${a.individual.photoFileId}` : null,
      resumeUrl: a.individual.resumeFileId ? `/api/files/${a.individual.resumeFileId}` : null,
      resumeName: a.individual.resumeFile?.originalName ?? null,
    },
  };
}
