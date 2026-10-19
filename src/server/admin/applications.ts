import "server-only";
import type { ApplicationStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { contains, reviewFilter } from "@/server/admin/jobs";

// コンタクト申込 (BHALO200). The spec only emailed these to staff; they are
// stored so staff can track them, so this screen has no BHALO number.

export const APPLICATION_PAGE_SIZE = 50;

const STATUSES: readonly ApplicationStatus[] = ["new", "in_progress", "closed"];
export const isApplicationStatus = (v: string | undefined): v is ApplicationStatus =>
  !!v && (STATUSES as readonly string[]).includes(v);

export type ApplicationFilters = { status?: string; member?: string; target?: string; review?: string; page?: number };

export async function listApplications(f: ApplicationFilters) {
  const where: Prisma.ApplicationWhereInput = {
    status: isApplicationStatus(f.status) ? f.status : undefined,
    individual: f.member
      ? { OR: [{ fullName: contains(f.member) }, { nameKana: contains(f.member) }, { memberNo: contains(f.member) }] }
      : undefined,
    items: f.target ? { some: { targetLabel: contains(f.target) } } : undefined,
    reviewStatus: reviewFilter(f.review),
  };
  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    db.application.count({ where }),
    db.application.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * APPLICATION_PAGE_SIZE,
      take: APPLICATION_PAGE_SIZE,
      select: {
        id: true,
        status: true,
        reviewStatus: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        individual: { select: { id: true, memberNo: true, fullName: true } },
        items: { select: { id: true, targetLabel: true }, orderBy: { id: "asc" } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / APPLICATION_PAGE_SIZE)),
    rows: rows.map((r) => ({
      ...r,
      id: String(r.id),
      individual: { ...r.individual, id: String(r.individual.id) },
      items: r.items.map((i) => ({ ...i, id: String(i.id) })),
    })),
  };
}

export async function getApplication(id: bigint) {
  const a = await db.application.findUnique({
    where: { id },
    include: {
      individual: {
        select: {
          id: true,
          memberNo: true,
          fullName: true,
          nationality: true,
          contactEmail: true,
          mobile: true,
          user: { select: { email: true } },
        },
      },
      items: {
        orderBy: { id: "asc" },
        include: {
          jobPosting: { select: { id: true, jobNo: true, jobType: true, corporation: { select: { id: true, name: true } } } },
          recruitment: {
            select: { id: true, recruitmentNo: true, faculty: true, department: true, corporation: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!a) return null;
  return {
    id: String(a.id),
    status: a.status,
    reviewStatus: a.reviewStatus,
    rejectionReason: a.rejectionReason ?? "",
    submittedAt: a.submittedAt,
    reviewedAt: a.reviewedAt,
    staffNote: a.staffNote ?? "",
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    individual: {
      id: String(a.individual.id),
      memberNo: a.individual.memberNo,
      fullName: a.individual.fullName,
      nationality: a.individual.nationality ?? "",
      contactEmail: a.individual.contactEmail ?? "",
      mobile: a.individual.mobile ?? "",
      loginEmail: a.individual.user.email,
    },
    items: a.items.map((i) => ({
      id: String(i.id),
      targetLabel: i.targetLabel,
      job: i.jobPosting
        ? {
            id: String(i.jobPosting.id),
            jobNo: i.jobPosting.jobNo,
            jobType: i.jobPosting.jobType ?? "",
            companyId: String(i.jobPosting.corporation.id),
            companyName: i.jobPosting.corporation.name,
          }
        : null,
      recruitment: i.recruitment
        ? {
            id: String(i.recruitment.id),
            recruitmentNo: i.recruitment.recruitmentNo,
            faculty: i.recruitment.faculty ?? "",
            department: i.recruitment.department ?? "",
            schoolId: String(i.recruitment.corporation.id),
            schoolName: i.recruitment.corporation.name,
          }
        : null,
    })),
  };
}

export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplication>>>;

export async function updateApplication(id: bigint, input: { status: ApplicationStatus; staffNote?: string }) {
  await db.application.update({ where: { id }, data: { status: input.status, staffNote: input.staffNote ?? null } });
}

export async function deleteApplication(id: bigint) {
  await db.application.delete({ where: { id } });
}
