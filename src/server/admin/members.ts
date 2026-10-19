import "server-only";
import { Prisma, type JobTrack, type ReviewStatus, type SchoolCategory } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { fromDate, fromMonth, toDate, toMonth } from "@/server/admin/form";
import { activeFilter, contains, reviewFilter } from "@/server/admin/jobs";
import { decryptString, encryptionConfigured, maskTail } from "@/server/crypto";
import type { SectionKey } from "@/lib/admin/member-sections";

// 個人会員情報 for the admin console (BHALO805 / 806). An individual is the
// profile of one User (accountType "individual"); its child tables are the
// wizard screens BHALO014–026 and the 履歴書 (BHALO201 / 202).
// Ids leave this module as strings so they can be passed to client components.

export const MEMBER_PAGE_SIZE = 50;

/** "job" = 求職 (any job track wanted), "study" = 就学 (any school wanted). */
export const goalFilterOptions = [
  { value: "", label: "すべて" },
  { value: "job", label: "求職" },
  { value: "study", label: "就学" },
];

const jobWanted: Prisma.IndividualWhereInput = {
  OR: [{ wantsEngineer: true }, { wantsSsw: true }, { wantsTitp: true }],
};
const studyWanted: Prisma.IndividualWhereInput = {
  OR: [{ wantsUniversity: true }, { wantsVocational: true }, { wantsLanguageSchool: true }],
};

export type MemberFilters = {
  name?: string;
  gender?: string;
  nationality?: string;
  goal?: string;
  active?: string;
  review?: string;
  page?: number;
};

export async function listMembers(f: MemberFilters) {
  const and: Prisma.IndividualWhereInput[] = [];
  if (f.name) and.push({ OR: [{ fullName: contains(f.name) }, { nameKana: contains(f.name) }] });
  if (f.goal === "job") and.push(jobWanted);
  if (f.goal === "study") and.push(studyWanted);
  // 未提出 = never submitted; 審査中 = submitted and not yet decided (new rows
  // default to pending, so the submitted_at check keeps drafts out).
  if (f.review === "draft") and.push({ submittedAt: null });
  if (f.review === "pending") and.push({ submittedAt: { not: null } });
  const where: Prisma.IndividualWhereInput = {
    AND: and,
    gender: f.gender || undefined,
    nationality: f.nationality || undefined,
    isActive: activeFilter(f.active),
    reviewStatus: f.review === "draft" ? undefined : reviewFilter(f.review),
  };
  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    db.individual.count({ where }),
    db.individual.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * MEMBER_PAGE_SIZE,
      take: MEMBER_PAGE_SIZE,
      select: {
        id: true,
        memberNo: true,
        fullName: true,
        gender: true,
        birthDate: true,
        nationality: true,
        wantsEngineer: true,
        wantsSsw: true,
        wantsTitp: true,
        wantsUniversity: true,
        wantsVocational: true,
        wantsLanguageSchool: true,
        isActive: true,
        reviewStatus: true,
        rejectionReason: true,
        submittedAt: true,
        user: { select: { email: true } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE)),
    rows: rows.map((r) => ({
      id: String(r.id),
      memberNo: r.memberNo,
      fullName: r.fullName,
      gender: r.gender ?? "",
      birthDate: r.birthDate,
      nationality: r.nationality ?? "",
      wantsJob: r.wantsEngineer || r.wantsSsw || r.wantsTitp,
      wantsStudy: r.wantsUniversity || r.wantsVocational || r.wantsLanguageSchool,
      email: r.user.email,
      isActive: r.isActive,
      reviewStatus: r.reviewStatus,
      rejectionReason: r.rejectionReason ?? "",
      submitted: r.submittedAt !== null,
    })),
  };
}

export type ResumeDetail = {
  heightCm: string;
  weightKg: string;
  bloodType: string;
  dominantHand: string;
  hasTattoo: boolean | null;
  tattooLocation: string;
  smokes: boolean | null;
  /** "****1234" when a number is stored, "" otherwise. Never the plain number. */
  passportMasked: string;
  eyesightRight: string;
  eyesightLeft: string;
  alcohol: string;
  allergies: string;
  religion: string;
  sensitiveConsentAt: Date | null;
  strengths: string;
  weaknesses: string;
  motivation: string;
  hobbies: string;
  otherNotes: string;
};

/** One child-table row with every value as a form string (months "YYYY-MM", dates "YYYY-MM-DD"). */
export type SectionRow = Record<string, string>;

export type MemberDetail = {
  id: string;
  memberNo: string;
  email: string;
  fullName: string;
  nameKana: string;
  gender: string;
  birthDate: string;
  hasSpouse: boolean | null;
  hasChildren: boolean | null;
  childrenCount: number | null;
  residenceCountry: string;
  nationality: string;
  nativeLanguage: string;
  mobile: string;
  contactEmail: string;
  postalCode: string;
  state: string;
  city: string;
  street: string;
  houseNumber: string;
  visaStatus: string;
  visaExpiry: string;
  introduction: string;
  wantsEngineer: boolean;
  wantsSsw: boolean;
  wantsTitp: boolean;
  wantsUniversity: boolean;
  wantsVocational: boolean;
  wantsLanguageSchool: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  resume: ResumeDetail | null;
  sections: Record<SectionKey, SectionRow[]>;
};

const dec = (d: Prisma.Decimal | null) => (d === null ? "" : d.toString());
const num = (n: number | null) => (n === null ? "" : String(n));

/** The masked passport number for the form; never throws (a missing or changed key shows a note instead). */
function maskedPassport(stored: string | null): string {
  if (!stored) return "";
  if (!encryptionConfigured()) return "（登録済み・APP_ENCRYPTION_KEY未設定のため表示不可）";
  try {
    return maskTail(decryptString(stored));
  } catch {
    return "（登録済み・復号できません）";
  }
}

export async function getMember(id: bigint): Promise<MemberDetail | null> {
  const m = await db.individual.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      resume: true,
      languages: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      educations: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      workExperiences: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      certifications: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      preferredAreas: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      jobWishes: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      studyWishes: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      familyMembers: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    },
  });
  if (!m) return null;
  const r = m.resume;
  return {
    id: String(m.id),
    memberNo: m.memberNo,
    email: m.user.email,
    fullName: m.fullName,
    nameKana: m.nameKana ?? "",
    gender: m.gender ?? "",
    birthDate: fromDate(m.birthDate),
    hasSpouse: m.hasSpouse,
    hasChildren: m.hasChildren,
    childrenCount: m.childrenCount,
    residenceCountry: m.residenceCountry ?? "",
    nationality: m.nationality ?? "",
    nativeLanguage: m.nativeLanguage ?? "",
    mobile: m.mobile ?? "",
    contactEmail: m.contactEmail ?? "",
    postalCode: m.postalCode ?? "",
    state: m.state ?? "",
    city: m.city ?? "",
    street: m.street ?? "",
    houseNumber: m.houseNumber ?? "",
    visaStatus: m.visaStatus ?? "",
    visaExpiry: fromMonth(m.visaExpiry),
    introduction: m.introduction ?? "",
    wantsEngineer: m.wantsEngineer,
    wantsSsw: m.wantsSsw,
    wantsTitp: m.wantsTitp,
    wantsUniversity: m.wantsUniversity,
    wantsVocational: m.wantsVocational,
    wantsLanguageSchool: m.wantsLanguageSchool,
    isActive: m.isActive,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    resume: r
      ? {
          heightCm: dec(r.heightCm),
          weightKg: dec(r.weightKg),
          bloodType: r.bloodType ?? "",
          dominantHand: r.dominantHand ?? "",
          hasTattoo: r.hasTattoo,
          tattooLocation: r.tattooLocation ?? "",
          smokes: r.smokes,
          passportMasked: maskedPassport(r.passportNo),
          eyesightRight: dec(r.eyesightRight),
          eyesightLeft: dec(r.eyesightLeft),
          alcohol: r.alcohol ?? "",
          allergies: r.allergies ?? "",
          religion: r.religion ?? "",
          sensitiveConsentAt: r.sensitiveConsentAt,
          strengths: r.strengths ?? "",
          weaknesses: r.weaknesses ?? "",
          motivation: r.motivation ?? "",
          hobbies: r.hobbies ?? "",
          otherNotes: r.otherNotes ?? "",
        }
      : null,
    sections: {
      languages: m.languages.map((x) => ({ language: x.language, level: x.level ?? "" })),
      educations: m.educations.map((x) => ({
        degree: x.degree ?? "",
        schoolName: x.schoolName ?? "",
        enrolledOn: fromMonth(x.enrolledOn),
        graduatedOn: fromMonth(x.graduatedOn),
        passedOn: fromMonth(x.passedOn),
        major: x.major ?? "",
      })),
      workExperiences: m.workExperiences.map((x) => ({
        companyName: x.companyName ?? "",
        industry: x.industry ?? "",
        joinedOn: fromMonth(x.joinedOn),
        leftOn: fromMonth(x.leftOn),
      })),
      certifications: m.certifications.map((x) => ({
        name: x.name,
        certificateTitle: x.certificateTitle ?? "",
        acquiredOn: fromMonth(x.acquiredOn),
      })),
      preferredAreas: m.preferredAreas.map((x) => ({
        country: x.country ?? "",
        region: x.region ?? "",
        prefecture: x.prefecture ?? "",
        city: x.city ?? "",
        freeText: x.freeText ?? "",
      })),
      jobWishes: m.jobWishes.map((x) => ({
        track: x.track,
        desiredJob: x.desiredJob ?? "",
        desiredSalary: x.desiredSalary ?? "",
        yearsOfStay: num(x.yearsOfStay),
        sswTest: x.sswTest ?? "",
        notes: x.notes ?? "",
      })),
      studyWishes: m.studyWishes.map((x) => ({
        schoolCategory: x.schoolCategory,
        universityLevel: x.universityLevel ?? "",
        schoolName: x.schoolName ?? "",
        faculty: x.faculty ?? "",
        department: x.department ?? "",
        notes: x.notes ?? "",
      })),
      familyMembers: m.familyMembers.map((x) => ({
        relation: x.relation ?? "",
        fullName: x.fullName ?? "",
        birthDate: fromDate(x.birthDate),
        address: x.address ?? "",
        occupation: x.occupation ?? "",
      })),
    },
  };
}

export type ResumeInput = {
  heightCm?: number;
  weightKg?: number;
  bloodType?: string;
  dominantHand?: string;
  hasTattoo?: boolean;
  tattooLocation?: string;
  smokes?: boolean;
  /** Already encrypted. undefined = keep the stored number, null = remove it. */
  passportNo?: string | null;
  eyesightRight?: number;
  eyesightLeft?: number;
  alcohol?: string;
  allergies?: string;
  religion?: string;
  /** 要配慮個人情報 consent checkbox; the timestamp is set on the first save with it checked. */
  sensitiveConsent: boolean;
  strengths?: string;
  weaknesses?: string;
  motivation?: string;
  hobbies?: string;
  otherNotes?: string;
};

export type MemberInput = {
  /** ログインID. */
  email: string;
  fullName: string;
  nameKana?: string;
  gender?: string;
  birthDate?: string;
  hasSpouse?: boolean;
  hasChildren?: boolean;
  childrenCount?: number;
  residenceCountry?: string;
  nationality?: string;
  nativeLanguage?: string;
  mobile?: string;
  contactEmail?: string;
  postalCode?: string;
  state?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  visaStatus?: string;
  visaExpiry?: string;
  introduction?: string;
  wantsEngineer: boolean;
  wantsSsw: boolean;
  wantsTitp: boolean;
  wantsUniversity: boolean;
  wantsVocational: boolean;
  wantsLanguageSchool: boolean;
  isActive: boolean;
  resume: ResumeInput;
};

/** The login email is unique across every account type (ERR: 登録済み). */
export class EmailTakenError extends Error {
  constructor() {
    super("email already registered");
    this.name = "EmailTakenError";
  }
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

// Empty fields clear the column (undefined would mean "leave unchanged").
function individualData(input: MemberInput) {
  return {
    fullName: input.fullName,
    nameKana: input.nameKana ?? null,
    gender: input.gender ?? null,
    birthDate: toDate(input.birthDate),
    hasSpouse: input.hasSpouse ?? null,
    hasChildren: input.hasChildren ?? null,
    childrenCount: input.childrenCount ?? null,
    residenceCountry: input.residenceCountry ?? null,
    nationality: input.nationality ?? null,
    nativeLanguage: input.nativeLanguage ?? null,
    mobile: input.mobile ?? null,
    contactEmail: input.contactEmail ?? null,
    postalCode: input.postalCode ?? null,
    state: input.state ?? null,
    city: input.city ?? null,
    street: input.street ?? null,
    houseNumber: input.houseNumber ?? null,
    visaStatus: input.visaStatus ?? null,
    visaExpiry: toMonth(input.visaExpiry),
    introduction: input.introduction ?? null,
    wantsEngineer: input.wantsEngineer,
    wantsSsw: input.wantsSsw,
    wantsTitp: input.wantsTitp,
    wantsUniversity: input.wantsUniversity,
    wantsVocational: input.wantsVocational,
    wantsLanguageSchool: input.wantsLanguageSchool,
    isActive: input.isActive,
  };
}

/** Everything on the 履歴書 except the passport number, which is decided by the caller. */
function resumeData(r: ResumeInput, sensitiveConsentAt: Date | null) {
  return {
    heightCm: r.heightCm ?? null,
    weightKg: r.weightKg ?? null,
    bloodType: r.bloodType ?? null,
    dominantHand: r.dominantHand ?? null,
    hasTattoo: r.hasTattoo ?? null,
    tattooLocation: r.tattooLocation ?? null,
    smokes: r.smokes ?? null,
    eyesightRight: r.eyesightRight ?? null,
    eyesightLeft: r.eyesightLeft ?? null,
    alcohol: r.alcohol ?? null,
    allergies: r.allergies ?? null,
    religion: r.religion ?? null,
    sensitiveConsentAt,
    strengths: r.strengths ?? null,
    weaknesses: r.weaknesses ?? null,
    motivation: r.motivation ?? null,
    hobbies: r.hobbies ?? null,
    otherNotes: r.otherNotes ?? null,
  };
}

/** User + Individual + Resume in one transaction. The member number is assigned by the database. */
/** 審査 fields a write may set alongside the profile data. */
export type ReviewPatch = Partial<{
  reviewStatus: ReviewStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  rejectionReason: string | null;
}>;

export async function createMember(input: MemberInput, review: ReviewPatch = {}): Promise<bigint> {
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, name: input.fullName.slice(0, 80), accountType: "individual" },
        select: { id: true },
      });
      const individual = await tx.individual.create({
        data: { userId: user.id, ...individualData(input), ...review },
        select: { id: true },
      });
      await tx.resume.create({
        data: {
          individualId: individual.id,
          passportNo: input.resume.passportNo ?? null,
          ...resumeData(input.resume, input.resume.sensitiveConsent ? new Date() : null),
        },
      });
      return individual.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new EmailTakenError();
    throw e;
  }
}

export async function updateMember(id: bigint, input: MemberInput) {
  try {
    await db.$transaction(async (tx) => {
      const current = await tx.individual.findUniqueOrThrow({
        where: { id },
        select: { userId: true, resume: { select: { sensitiveConsentAt: true } } },
      });
      await tx.user.update({
        where: { id: current.userId },
        data: { email: input.email, name: input.fullName.slice(0, 80) },
      });
      await tx.individual.update({ where: { id }, data: individualData(input) });
      // The consent timestamp records the first save with the box checked; unchecking clears it.
      const consentAt = input.resume.sensitiveConsent ? (current.resume?.sensitiveConsentAt ?? new Date()) : null;
      const data = resumeData(input.resume, consentAt);
      await tx.resume.upsert({
        where: { individualId: id },
        create: { individualId: id, passportNo: input.resume.passportNo ?? null, ...data },
        update: { passportNo: input.resume.passportNo, ...data },
      });
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new EmailTakenError();
    throw e;
  }
}

/** Removes the login; the profile and every child row go with it (ON DELETE CASCADE). */
export async function deleteMember(id: bigint) {
  const m = await db.individual.findUnique({ where: { id }, select: { userId: true } });
  if (!m) return;
  await db.user.delete({ where: { id: m.userId } });
}

export async function memberExists(id: bigint) {
  return (await db.individual.count({ where: { id } })) > 0;
}

// --- Child tables (BHALO014–026, 202) -----------------------------------------
// Each section is saved whole, as the wizard does: delete the member's rows,
// then insert the screen's rows in order.

type RowOf<T> = Omit<T, "id" | "individualId" | "sortOrder">;

export type LanguageRow = RowOf<Prisma.IndividualLanguageCreateManyInput>;
export type EducationRow = RowOf<Prisma.IndividualEducationCreateManyInput>;
export type WorkExperienceRow = RowOf<Prisma.IndividualWorkExperienceCreateManyInput>;
export type CertificationRow = RowOf<Prisma.IndividualCertificationCreateManyInput>;
export type PreferredAreaRow = RowOf<Prisma.IndividualPreferredAreaCreateManyInput>;
export type JobWishRow = RowOf<Prisma.IndividualJobWishCreateManyInput>;
export type StudyWishRow = RowOf<Prisma.IndividualStudyWishCreateManyInput>;
export type FamilyMemberRow = RowOf<Prisma.FamilyMemberCreateManyInput>;

export type SectionPayload =
  | { section: "languages"; rows: LanguageRow[] }
  | { section: "educations"; rows: EducationRow[] }
  | { section: "workExperiences"; rows: WorkExperienceRow[] }
  | { section: "certifications"; rows: CertificationRow[] }
  | { section: "preferredAreas"; rows: PreferredAreaRow[] }
  | { section: "jobWishes"; rows: JobWishRow[] }
  | { section: "studyWishes"; rows: StudyWishRow[] }
  | { section: "familyMembers"; rows: FamilyMemberRow[] };

const withOrder = <R>(individualId: bigint, rows: R[]) => rows.map((r, i) => ({ ...r, individualId, sortOrder: i }));

export async function replaceSectionRows(individualId: bigint, payload: SectionPayload) {
  await db.$transaction(async (tx) => {
    const where = { individualId };
    switch (payload.section) {
      case "languages":
        await tx.individualLanguage.deleteMany({ where });
        await tx.individualLanguage.createMany({ data: withOrder(individualId, payload.rows) });
        return;
      case "educations":
        await tx.individualEducation.deleteMany({ where });
        await tx.individualEducation.createMany({ data: withOrder(individualId, payload.rows) });
        return;
      case "workExperiences":
        await tx.individualWorkExperience.deleteMany({ where });
        await tx.individualWorkExperience.createMany({ data: withOrder(individualId, payload.rows) });
        return;
      case "certifications":
        await tx.individualCertification.deleteMany({ where });
        await tx.individualCertification.createMany({ data: withOrder(individualId, payload.rows) });
        return;
      case "preferredAreas":
        await tx.individualPreferredArea.deleteMany({ where });
        await tx.individualPreferredArea.createMany({ data: withOrder(individualId, payload.rows) });
        return;
      case "jobWishes":
        await tx.individualJobWish.deleteMany({ where });
        await tx.individualJobWish.createMany({ data: withOrder(individualId, payload.rows) });
        return;
      case "studyWishes":
        await tx.individualStudyWish.deleteMany({ where });
        await tx.individualStudyWish.createMany({ data: withOrder(individualId, payload.rows) });
        return;
      case "familyMembers":
        await tx.familyMember.deleteMany({ where });
        await tx.familyMember.createMany({ data: withOrder(individualId, payload.rows) });
        return;
    }
  });
}

/**
 * The candidate wizard saves 技人国 / 特定技能 / 技能実習 on three separate steps,
 * so each one replaces only the rows of its own track (the admin editor replaces
 * the whole section with replaceSectionRows).
 */
export async function replaceJobWishRows(individualId: bigint, track: JobTrack, rows: JobWishRow[]) {
  await db.$transaction([
    db.individualJobWish.deleteMany({ where: { individualId, track } }),
    db.individualJobWish.createMany({ data: rows.map((r, i) => ({ ...r, individualId, track, sortOrder: i })) }),
  ]);
}

/** Same for 大学・大学院 / 専門学校 / 日本語学校. */
export async function replaceStudyWishRows(individualId: bigint, schoolCategory: SchoolCategory, rows: StudyWishRow[]) {
  await db.$transaction([
    db.individualStudyWish.deleteMany({ where: { individualId, schoolCategory } }),
    db.individualStudyWish.createMany({
      data: rows.map((r, i) => ({ ...r, individualId, schoolCategory, sortOrder: i })),
    }),
  ]);
}
