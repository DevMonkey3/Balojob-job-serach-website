import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { activeFilter, contains } from "@/server/admin/jobs";
import { schoolCategoryFilter, schoolCategoryText } from "@/server/admin/corporations";

// 生徒募集情報 for the admin console (BHALO809 / 156). Each row belongs to a
// school corporation. Ids leave this module as strings so they can be passed
// to client components.

export const RECRUITMENT_PAGE_SIZE = 50;

export type RecruitmentFilters = {
  school?: string;
  /** 学校種別 → corporation flag. */
  category?: string;
  faculty?: string;
  department?: string;
  location?: string;
  active?: string;
  page?: number;
};

export async function listRecruitments(f: RecruitmentFilters) {
  const where: Prisma.RecruitmentWhereInput = {
    corporation: { kind: "school", name: contains(f.school), ...schoolCategoryFilter(f.category) },
    faculty: contains(f.faculty),
    department: contains(f.department),
    location: contains(f.location),
    isActive: activeFilter(f.active),
  };
  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    db.recruitment.count({ where }),
    db.recruitment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * RECRUITMENT_PAGE_SIZE,
      take: RECRUITMENT_PAGE_SIZE,
      select: {
        id: true,
        recruitmentNo: true,
        faculty: true,
        department: true,
        schoolGender: true,
        location: true,
        isActive: true,
        createdAt: true,
        corporation: {
          select: {
            id: true,
            memberNo: true,
            name: true,
            url: true,
            isUniversity: true,
            isVocationalSchool: true,
            isLanguageSchool: true,
          },
        },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / RECRUITMENT_PAGE_SIZE)),
    rows: rows.map((r) => ({
      ...r,
      id: String(r.id),
      corporation: {
        ...r.corporation,
        id: String(r.corporation.id),
        schoolCategory: schoolCategoryText(r.corporation),
      },
    })),
  };
}

export type RecruitmentDetail = {
  id: string;
  corporationId: string;
  memberNo: string;
  schoolName: string;
  recruitmentNo: number;
  faculty: string;
  department: string;
  schoolGender: string;
  location: string;
  capacity: number | null;
  annualTuition: number | null;
  contactPerson: string;
  contactEmail: string;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getRecruitment(id: bigint): Promise<RecruitmentDetail | null> {
  const r = await db.recruitment.findUnique({
    where: { id },
    include: { corporation: { select: { id: true, memberNo: true, name: true } } },
  });
  if (!r) return null;
  return {
    id: String(r.id),
    corporationId: String(r.corporation.id),
    memberNo: r.corporation.memberNo,
    schoolName: r.corporation.name,
    recruitmentNo: r.recruitmentNo,
    faculty: r.faculty ?? "",
    department: r.department ?? "",
    schoolGender: r.schoolGender ?? "",
    location: r.location ?? "",
    capacity: r.capacity,
    annualTuition: r.annualTuition,
    contactPerson: r.contactPerson ?? "",
    contactEmail: r.contactEmail ?? "",
    notes: r.notes ?? "",
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export type RecruitmentInput = {
  faculty?: string;
  department?: string;
  schoolGender?: string;
  location?: string;
  capacity?: number;
  annualTuition?: number;
  contactPerson?: string;
  contactEmail?: string;
  notes?: string;
  isActive: boolean;
};

// Empty fields clear the column (undefined would mean "leave unchanged").
function recruitmentData(input: RecruitmentInput) {
  return {
    faculty: input.faculty ?? null,
    department: input.department ?? null,
    schoolGender: input.schoolGender ?? null,
    location: input.location ?? null,
    capacity: input.capacity ?? null,
    annualTuition: input.annualTuition ?? null,
    contactPerson: input.contactPerson ?? null,
    contactEmail: input.contactEmail ?? null,
    notes: input.notes ?? null,
    isActive: input.isActive,
  };
}

/** 生徒募集番号 = the school's highest number + 1 (spec: 最終行の生徒募集番号＋1). */
export async function createRecruitment(corporationId: bigint, input: RecruitmentInput): Promise<bigint> {
  const max = await db.recruitment.aggregate({ where: { corporationId }, _max: { recruitmentNo: true } });
  const created = await db.recruitment.create({
    data: { corporationId, recruitmentNo: (max._max.recruitmentNo ?? 0) + 1, ...recruitmentData(input) },
    select: { id: true },
  });
  return created.id;
}

export async function updateRecruitment(id: bigint, input: RecruitmentInput) {
  await db.recruitment.update({ where: { id }, data: recruitmentData(input) });
}

export async function deleteRecruitment(id: bigint) {
  await db.recruitment.delete({ where: { id } });
}
