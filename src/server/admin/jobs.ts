import "server-only";
import type { JobTrack, Prisma, ReviewStatus } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { fromTime, toTime } from "@/server/admin/form";

// 求人情報 for the admin console (BHALO801 / 802 / 117).
// Ids leave this module as strings so they can be passed to client components.

export const JOB_PAGE_SIZE = 50;

const TRACKS: readonly JobTrack[] = ["engineer", "ssw", "titp"];
export const isTrack = (v: string | undefined): v is JobTrack => !!v && (TRACKS as readonly string[]).includes(v);

/** Partial, case-insensitive match; undefined when the filter is empty. */
export const contains = (v: string | undefined) => (v ? { contains: v, mode: "insensitive" as const } : undefined);

/** "active" / "inactive" filter value → boolean, "" → no filter. */
export const activeFilter = (v: string | undefined) => (v === "active" ? true : v === "inactive" ? false : undefined);

const REVIEW_STATUSES: readonly ReviewStatus[] = ["pending", "approved", "rejected"];
export const isReviewStatus = (v: string | undefined): v is ReviewStatus =>
  !!v && (REVIEW_STATUSES as readonly string[]).includes(v);
/** "pending" / "approved" / "rejected" filter value → enum, "" → no filter. */
export const reviewFilter = (v: string | undefined) => (isReviewStatus(v) ? v : undefined);

export type JobFilters = {
  company?: string;
  industry?: string;
  jobType?: string;
  location?: string;
  track?: string;
  active?: string;
  review?: string;
  page?: number;
};

export async function listJobs(f: JobFilters) {
  const where: Prisma.JobPostingWhereInput = {
    corporation: f.company ? { name: contains(f.company) } : undefined,
    industry: contains(f.industry),
    jobType: contains(f.jobType),
    location: contains(f.location),
    track: isTrack(f.track) ? f.track : undefined,
    isActive: activeFilter(f.active),
    reviewStatus: reviewFilter(f.review),
  };
  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    db.jobPosting.count({ where }),
    db.jobPosting.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * JOB_PAGE_SIZE,
      take: JOB_PAGE_SIZE,
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
        createdAt: true,
        corporation: { select: { id: true, memberNo: true, name: true } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / JOB_PAGE_SIZE)),
    rows: rows.map((r) => ({
      ...r,
      id: String(r.id),
      corporation: { ...r.corporation, id: String(r.corporation.id) },
    })),
  };
}

export type JobOrderDetail = {
  dailyWorkingTime: string;
  overtimeDailyHours: number | null;
  overtimeMonthlyAvgHours: number | null;
  breakTime: string;
  avgWorkDaysPerMonth: number | null;
  annualWorkHours: number | null;
  weeklyWorkDays: string;
  hasEmploymentInsurance: boolean;
  hasWorkersComp: boolean;
  hasHealthInsurance: boolean;
  hasPension: boolean;
  commuteFull: boolean;
  commuteFixed: boolean;
  japaneseLevel: string;
};

export type JobDetail = {
  id: string;
  corporationId: string;
  memberNo: string;
  companyName: string;
  jobNo: number;
  track: JobTrack;
  industry: string;
  jobType: string;
  workName: string;
  employmentType: string;
  description: string;
  location: string;
  hoursFrom: string;
  hoursTo: string;
  holidays: string;
  monthlySalary: number | null;
  contactPerson: string;
  contactEmail: string;
  features: string;
  isActive: boolean;
  reviewStatus: ReviewStatus;
  rejectionReason: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  jobOrder: JobOrderDetail | null;
};

export async function getJob(id: bigint): Promise<JobDetail | null> {
  const j = await db.jobPosting.findUnique({
    where: { id },
    include: { corporation: { select: { id: true, memberNo: true, name: true } }, jobOrder: true },
  });
  if (!j) return null;
  const o = j.jobOrder;
  return {
    id: String(j.id),
    corporationId: String(j.corporation.id),
    memberNo: j.corporation.memberNo,
    companyName: j.corporation.name,
    jobNo: j.jobNo,
    track: j.track,
    industry: j.industry ?? "",
    jobType: j.jobType ?? "",
    workName: j.workName ?? "",
    employmentType: j.employmentType ?? "",
    description: j.description ?? "",
    location: j.location ?? "",
    hoursFrom: fromTime(j.hoursFrom),
    hoursTo: fromTime(j.hoursTo),
    holidays: j.holidays ?? "",
    monthlySalary: j.monthlySalary,
    contactPerson: j.contactPerson ?? "",
    contactEmail: j.contactEmail ?? "",
    features: j.features ?? "",
    isActive: j.isActive,
    reviewStatus: j.reviewStatus,
    rejectionReason: j.rejectionReason ?? "",
    submittedAt: j.submittedAt,
    reviewedAt: j.reviewedAt,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
    jobOrder: o
      ? {
          dailyWorkingTime: fromTime(o.dailyWorkingTime),
          overtimeDailyHours: o.overtimeDailyHours,
          overtimeMonthlyAvgHours: o.overtimeMonthlyAvgHours,
          breakTime: o.breakTime ?? "",
          avgWorkDaysPerMonth: o.avgWorkDaysPerMonth,
          annualWorkHours: o.annualWorkHours,
          weeklyWorkDays: o.weeklyWorkDays ?? "",
          hasEmploymentInsurance: o.hasEmploymentInsurance,
          hasWorkersComp: o.hasWorkersComp,
          hasHealthInsurance: o.hasHealthInsurance,
          hasPension: o.hasPension,
          commuteFull: o.commuteFull,
          commuteFixed: o.commuteFixed,
          japaneseLevel: o.japaneseLevel ?? "",
        }
      : null,
  };
}

export async function findCorporationByMemberNo(memberNo: string) {
  return db.corporation.findUnique({
    where: { memberNo: memberNo.trim() },
    select: { id: true, name: true, kind: true },
  });
}

export type JobInput = {
  track: JobTrack;
  industry?: string;
  jobType?: string;
  workName?: string;
  employmentType?: string;
  description?: string;
  location?: string;
  hoursFrom?: string;
  hoursTo?: string;
  holidays?: string;
  monthlySalary?: number;
  contactPerson?: string;
  contactEmail?: string;
  features?: string;
  isActive: boolean;
};

// Empty fields clear the column (undefined would mean "leave unchanged").
function jobData(input: JobInput) {
  return {
    track: input.track,
    industry: input.industry ?? null,
    jobType: input.jobType ?? null,
    workName: input.workName ?? null,
    employmentType: input.employmentType ?? null,
    description: input.description ?? null,
    location: input.location ?? null,
    hoursFrom: toTime(input.hoursFrom),
    hoursTo: toTime(input.hoursTo),
    holidays: input.holidays ?? null,
    monthlySalary: input.monthlySalary ?? null,
    contactPerson: input.contactPerson ?? null,
    contactEmail: input.contactEmail ?? null,
    features: input.features ?? null,
    isActive: input.isActive,
  };
}

/** 審査 fields a write may set alongside the job data. */
export type ReviewPatch = Partial<{
  reviewStatus: ReviewStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  rejectionReason: string | null;
}>;

/** 求人番号 = the company's highest number + 1 (spec: MAX値＋1). */
export async function createJob(corporationId: bigint, input: JobInput, review: ReviewPatch = {}): Promise<bigint> {
  const max = await db.jobPosting.aggregate({ where: { corporationId }, _max: { jobNo: true } });
  const created = await db.jobPosting.create({
    data: { corporationId, jobNo: (max._max.jobNo ?? 0) + 1, ...jobData(input), ...review },
    select: { id: true },
  });
  return created.id;
}

export async function updateJob(id: bigint, input: JobInput, review: ReviewPatch = {}) {
  await db.jobPosting.update({ where: { id }, data: { ...jobData(input), ...review } });
}

export async function deleteJob(id: bigint) {
  await db.jobPosting.delete({ where: { id } });
}

export type JobOrderInput = {
  dailyWorkingTime?: string;
  overtimeDailyHours?: number;
  overtimeMonthlyAvgHours?: number;
  breakTime?: string;
  avgWorkDaysPerMonth?: number;
  annualWorkHours?: number;
  weeklyWorkDays?: string;
  hasEmploymentInsurance: boolean;
  hasWorkersComp: boolean;
  hasHealthInsurance: boolean;
  hasPension: boolean;
  commuteFull: boolean;
  commuteFixed: boolean;
  japaneseLevel?: string;
};

/** 求人票 (BHALO117): one per posting, created on first save. */
export async function saveJobOrder(jobPostingId: bigint, input: JobOrderInput) {
  const data = {
    dailyWorkingTime: toTime(input.dailyWorkingTime),
    overtimeDailyHours: input.overtimeDailyHours ?? null,
    overtimeMonthlyAvgHours: input.overtimeMonthlyAvgHours ?? null,
    breakTime: input.breakTime ?? null,
    avgWorkDaysPerMonth: input.avgWorkDaysPerMonth ?? null,
    annualWorkHours: input.annualWorkHours ?? null,
    weeklyWorkDays: input.weeklyWorkDays ?? null,
    hasEmploymentInsurance: input.hasEmploymentInsurance,
    hasWorkersComp: input.hasWorkersComp,
    hasHealthInsurance: input.hasHealthInsurance,
    hasPension: input.hasPension,
    commuteFull: input.commuteFull,
    commuteFixed: input.commuteFixed,
    japaneseLevel: input.japaneseLevel ?? null,
  };
  await db.jobOrder.upsert({
    where: { jobPostingId },
    create: { jobPostingId, ...data },
    update: data,
  });
}
