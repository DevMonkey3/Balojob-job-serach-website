import "server-only";
import type { CorporationKind, JobTrack, Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { activeFilter, contains } from "@/server/admin/jobs";
import { schoolCategoryLabels } from "@/lib/format";

// 法人会員情報 for the admin console. Companies (BHALO803 / 804) and schools
// (BHALO807 / 808) share one table and are told apart by `kind`.
// Ids leave this module as strings so they can be passed to client components.

export const CORPORATION_PAGE_SIZE = 50;

export type SchoolFlags = { isUniversity: boolean; isVocationalSchool: boolean; isLanguageSchool: boolean };

/** 学校種別 filter value (a SchoolCategory) → the corporation flag it stands for; "" → no filter. */
export function schoolCategoryFilter(v: string | undefined): Prisma.CorporationWhereInput | undefined {
  switch (v) {
    case "university":
      return { isUniversity: true };
    case "vocational":
      return { isVocationalSchool: true };
    case "language_school":
      return { isLanguageSchool: true };
    default:
      return undefined;
  }
}

/** 所在地: partial match on 県 / 市区郡 / 町. */
export const locationFilter = (v: string | undefined): Prisma.CorporationWhereInput | undefined =>
  v ? { OR: [{ prefecture: contains(v) }, { city: contains(v) }, { town: contains(v) }] } : undefined;

export type AddressParts = {
  prefecture: string | null;
  city: string | null;
  town: string | null;
  addressLine: string | null;
};

/** 県 + 市区郡 + 町 + 番地 as one line. */
export const formatAddress = (a: AddressParts) => [a.prefecture, a.city, a.town, a.addressLine].filter(Boolean).join("");

/** 「大学・大学院・専門学校」: the labels of the checked school flags. */
export const schoolCategoryText = (c: SchoolFlags) =>
  [
    c.isUniversity && schoolCategoryLabels.university,
    c.isVocationalSchool && schoolCategoryLabels.vocational,
    c.isLanguageSchool && schoolCategoryLabels.language_school,
  ]
    .filter(Boolean)
    .join("・");

export type CorporationFilters = {
  name?: string;
  industry?: string;
  /** 学校種別 (schools only). */
  category?: string;
  location?: string;
  active?: string;
  page?: number;
};

export async function listCorporations(kind: CorporationKind, f: CorporationFilters) {
  const where: Prisma.CorporationWhereInput = {
    kind,
    name: contains(f.name),
    industry: contains(f.industry),
    isActive: activeFilter(f.active),
    ...schoolCategoryFilter(f.category),
    ...locationFilter(f.location),
  };
  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    db.corporation.count({ where }),
    db.corporation.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * CORPORATION_PAGE_SIZE,
      take: CORPORATION_PAGE_SIZE,
      select: {
        id: true,
        memberNo: true,
        name: true,
        industry: true,
        prefecture: true,
        city: true,
        town: true,
        addressLine: true,
        url: true,
        isUniversity: true,
        isVocationalSchool: true,
        isLanguageSchool: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / CORPORATION_PAGE_SIZE)),
    rows: rows.map((r) => ({
      ...r,
      id: String(r.id),
      address: formatAddress(r),
      schoolCategory: schoolCategoryText(r),
    })),
  };
}

export type CorporationRow = Awaited<ReturnType<typeof listCorporations>>["rows"][number];

export type CorporationDetail = {
  id: string;
  memberNo: string;
  kind: CorporationKind;
  /** ログインID (users.email). */
  email: string;
  name: string;
  nameKana: string;
  founded: string;
  representative: string;
  capitalManYen: number | null;
  headcount: number | null;
  industry: string;
  url: string;
  postalCode: string;
  prefecture: string;
  city: string;
  town: string;
  addressLine: string;
  contactPerson: string;
  phone: string;
  contactEmail: string;
  introduction: string;
  isCompany: boolean;
  isSupervisingOrg: boolean;
  isRegisteredSupportOrg: boolean;
  isUniversity: boolean;
  isVocationalSchool: boolean;
  isLanguageSchool: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** One corporation of the given kind; null when the id belongs to the other kind. */
export async function getCorporation(kind: CorporationKind, id: bigint): Promise<CorporationDetail | null> {
  const c = await db.corporation.findFirst({
    where: { id, kind },
    include: { user: { select: { email: true } } },
  });
  if (!c) return null;
  return {
    id: String(c.id),
    memberNo: c.memberNo,
    kind: c.kind,
    email: c.user.email,
    name: c.name,
    nameKana: c.nameKana ?? "",
    founded: c.founded ?? "",
    representative: c.representative,
    capitalManYen: c.capitalManYen,
    headcount: c.headcount,
    industry: c.industry ?? "",
    url: c.url ?? "",
    postalCode: c.postalCode ?? "",
    prefecture: c.prefecture ?? "",
    city: c.city ?? "",
    town: c.town ?? "",
    addressLine: c.addressLine ?? "",
    contactPerson: c.contactPerson ?? "",
    phone: c.phone ?? "",
    contactEmail: c.contactEmail ?? "",
    introduction: c.introduction ?? "",
    isCompany: c.isCompany,
    isSupervisingOrg: c.isSupervisingOrg,
    isRegisteredSupportOrg: c.isRegisteredSupportOrg,
    isUniversity: c.isUniversity,
    isVocationalSchool: c.isVocationalSchool,
    isLanguageSchool: c.isLanguageSchool,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export type CorporationJobRow = {
  id: string;
  jobNo: number;
  track: JobTrack;
  industry: string;
  jobType: string;
  isActive: boolean;
};

/** 求人情報一覧 (BHALO115) of one company. */
export async function listCorporationJobs(corporationId: bigint): Promise<CorporationJobRow[]> {
  const rows = await db.jobPosting.findMany({
    where: { corporationId },
    orderBy: { jobNo: "asc" },
    select: { id: true, jobNo: true, track: true, industry: true, jobType: true, isActive: true },
  });
  return rows.map((r) => ({ ...r, id: String(r.id), industry: r.industry ?? "", jobType: r.jobType ?? "" }));
}

export type CorporationRecruitmentRow = {
  id: string;
  recruitmentNo: number;
  faculty: string;
  department: string;
  schoolGender: string;
  isActive: boolean;
};

/** 生徒募集情報一覧 (BHALO155) of one school. */
export async function listCorporationRecruitments(corporationId: bigint): Promise<CorporationRecruitmentRow[]> {
  const rows = await db.recruitment.findMany({
    where: { corporationId },
    orderBy: { recruitmentNo: "asc" },
    select: { id: true, recruitmentNo: true, faculty: true, department: true, schoolGender: true, isActive: true },
  });
  return rows.map((r) => ({
    ...r,
    id: String(r.id),
    faculty: r.faculty ?? "",
    department: r.department ?? "",
    schoolGender: r.schoolGender ?? "",
  }));
}

export type CorporationInput = {
  email: string;
  name: string;
  nameKana?: string;
  founded?: string;
  representative: string;
  capitalManYen?: number;
  headcount?: number;
  industry?: string;
  url?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  town?: string;
  addressLine?: string;
  contactPerson?: string;
  phone?: string;
  contactEmail?: string;
  introduction?: string;
  isCompany: boolean;
  isSupervisingOrg: boolean;
  isRegisteredSupportOrg: boolean;
  isUniversity: boolean;
  isVocationalSchool: boolean;
  isLanguageSchool: boolean;
  isActive: boolean;
};

// Empty fields clear the column (undefined would mean "leave unchanged").
function corporationData(input: CorporationInput) {
  return {
    name: input.name,
    nameKana: input.nameKana ?? null,
    founded: input.founded ?? null,
    representative: input.representative,
    capitalManYen: input.capitalManYen ?? null,
    headcount: input.headcount ?? null,
    industry: input.industry ?? null,
    url: input.url ?? null,
    postalCode: input.postalCode ?? null,
    prefecture: input.prefecture ?? null,
    city: input.city ?? null,
    town: input.town ?? null,
    addressLine: input.addressLine ?? null,
    contactPerson: input.contactPerson ?? null,
    phone: input.phone ?? null,
    contactEmail: input.contactEmail ?? null,
    introduction: input.introduction ?? null,
    isCompany: input.isCompany,
    isSupervisingOrg: input.isSupervisingOrg,
    isRegisteredSupportOrg: input.isRegisteredSupportOrg,
    isUniversity: input.isUniversity,
    isVocationalSchool: input.isVocationalSchool,
    isLanguageSchool: input.isLanguageSchool,
    isActive: input.isActive,
  };
}

// The login row (users) mirrors the corporation: email is the login ID and the
// name is what the member sees in greetings (users.name holds 80 chars).
function userData(input: CorporationInput) {
  return { email: input.email.toLowerCase(), name: input.name.slice(0, 80) };
}

/**
 * Creates the login and the 法人会員情報 in one nested write (one transaction).
 * 法人会員番号 is assigned by the database. Throws Prisma P2002 when the email is taken.
 */
export async function createCorporation(kind: CorporationKind, input: CorporationInput): Promise<bigint> {
  const created = await db.corporation.create({
    data: {
      kind,
      ...corporationData(input),
      // Registered by staff, so the address counts as verified.
      user: { create: { ...userData(input), accountType: "corporate", emailVerified: true } },
    },
    select: { id: true },
  });
  return created.id;
}

export async function updateCorporation(id: bigint, input: CorporationInput) {
  await db.corporation.update({
    where: { id },
    data: { ...corporationData(input), user: { update: userData(input) } },
  });
}

/**
 * Deletes the login row; the corporation, its job postings and recruitments
 * go with it (ON DELETE CASCADE). False when no corporation of that kind has the id.
 */
export async function deleteCorporation(kind: CorporationKind, id: bigint): Promise<boolean> {
  const c = await db.corporation.findFirst({ where: { id, kind }, select: { userId: true } });
  if (!c) return false;
  await db.user.delete({ where: { id: c.userId } });
  return true;
}
