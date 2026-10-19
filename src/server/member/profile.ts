import "server-only";
import type { JobTrack, ReviewStatus, SchoolCategory } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { fromDate, fromMonth } from "@/server/admin/form";
import { sswTestLabels, universityLevelLabels } from "@/lib/admin/labels";
import type { Row, Values, WizardData } from "@/lib/wizard/types";

// The candidate's own profile (BHALO010–026) read in the WIZARD's shape, so the
// 17-step screens can be prefilled from the database. Field names here are the
// wizard's (src/lib/flows/individual.ts), not the column names.

/** "2026-04-01" → { year: "2026", month: "4" } like the wizard's yearMonth fields. */
function splitMonth(d: Date | null): { year: string; month: string } {
  const ym = fromMonth(d);
  if (!ym) return { year: "", month: "" };
  const [year, month] = ym.split("-");
  return { year, month: String(Number(month)) };
}

const yearMonth = (prefix: string, d: Date | null): Row => {
  const { year, month } = splitMonth(d);
  return { [`${prefix}Year`]: year, [`${prefix}Month`]: month };
};

const yesNo = (v: boolean | null): string => (v === null ? "" : v ? "1" : "0");

export async function loadProfile(individualId: bigint): Promise<WizardData> {
  const i = await db.individual.findUnique({
    where: { id: individualId },
    include: {
      languages: { orderBy: { sortOrder: "asc" } },
      educations: { orderBy: { sortOrder: "asc" } },
      workExperiences: { orderBy: { sortOrder: "asc" } },
      certifications: { orderBy: { sortOrder: "asc" } },
      preferredAreas: { orderBy: { sortOrder: "asc" } },
      jobWishes: { orderBy: { sortOrder: "asc" } },
      studyWishes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!i) return { values: {}, rows: {} };

  const visa = splitMonth(i.visaExpiry);

  const values: Record<string, Values> = {
    basic: {
      name: i.fullName,
      gender: i.gender ?? "",
      birthDate: fromDate(i.birthDate),
      hasSpouse: yesNo(i.hasSpouse),
      hasChildren: yesNo(i.hasChildren),
      childCount: i.childrenCount === null ? "" : String(i.childrenCount),
    },
    address: {
      residenceCountry: i.residenceCountry ?? "",
      nationality: i.nationality ?? "",
      nativeLanguage: i.nativeLanguage ?? "",
      mobile: i.mobile ?? "",
      email: i.contactEmail ?? "",
      postalCode: i.postalCode ?? "",
      state: i.state ?? "",
      city: i.city ?? "",
      street: i.street ?? "",
      houseNumber: i.houseNumber ?? "",
    },
    photo: { photo: i.photoFileId ?? "" },
    visa: { visaStatus: i.visaStatus ?? "", visaExpiryYear: visa.year, visaExpiryMonth: visa.month },
    introduction: { introduction: i.introduction ?? "" },
    preferences: {
      engineer: i.wantsEngineer,
      ssw: i.wantsSsw,
      titp: i.wantsTitp,
      university: i.wantsUniversity,
      vocational: i.wantsVocational,
      languageSchool: i.wantsLanguageSchool,
    },
  };

  const jobWishRows = (track: JobTrack): Row[] =>
    i.jobWishes
      .filter((w) => w.track === track)
      .map((w) => ({
        job: w.desiredJob ?? "",
        salary: w.desiredSalary ?? "",
        years: w.yearsOfStay === null ? "" : String(w.yearsOfStay),
        notes: w.notes ?? "",
        ...(track === "ssw" ? { test: w.sswTest ? sswTestLabels[w.sswTest] : "" } : {}),
      }));

  const studyWishRows = (category: SchoolCategory): Row[] =>
    i.studyWishes
      .filter((w) => w.schoolCategory === category)
      .map((w) => ({
        ...(category === "university" ? { type: w.universityLevel ? universityLevelLabels[w.universityLevel] : "" } : {}),
        school: w.schoolName ?? "",
        faculty: w.faculty ?? "",
        department: w.department ?? "",
        notes: w.notes ?? "",
      }));

  const rows: Record<string, Row[]> = {
    languages: i.languages.map((r) => ({ language: r.language, level: r.level ?? "" })),
    education: i.educations.map((r) => ({
      degree: r.degree ?? "",
      school: r.schoolName ?? "",
      ...yearMonth("enrolled", r.enrolledOn),
      ...yearMonth("graduated", r.graduatedOn),
      ...yearMonth("passed", r.passedOn),
      major: r.major ?? "",
    })),
    work: i.workExperiences.map((r) => ({
      company: r.companyName ?? "",
      industry: r.industry ?? "",
      ...yearMonth("joined", r.joinedOn),
      ...yearMonth("left", r.leftOn),
    })),
    certifications: i.certifications.map((r) => ({
      name: r.name,
      certificate: r.certificateTitle ?? "",
      ...yearMonth("acquired", r.acquiredOn),
    })),
    regions: i.preferredAreas.map((r) => ({
      country: r.country ?? "",
      region: r.region ?? "",
      prefecture: r.prefecture ?? "",
      city: r.city ?? "",
      free: r.freeText ?? "",
    })),
    engineer: jobWishRows("engineer"),
    ssw: jobWishRows("ssw"),
    titp: jobWishRows("titp"),
    university: studyWishRows("university"),
    vocational: studyWishRows("vocational"),
    "language-school": studyWishRows("language_school"),
  };

  return { values, rows };
}

export type CandidateStatus = {
  /** "draft" until the wizard has been submitted once. */
  status: "draft" | ReviewStatus;
  reason: string;
  submittedAt: Date | null;
  resumeFile: { id: string; name: string; url: string; uploadedAt: Date } | null;
};

/** What My Page shows about the review of the candidate's profile. */
export async function getCandidateStatus(individualId: bigint): Promise<CandidateStatus> {
  const i = await db.individual.findUnique({
    where: { id: individualId },
    select: {
      reviewStatus: true,
      rejectionReason: true,
      submittedAt: true,
      resumeFile: { select: { id: true, originalName: true, createdAt: true } },
    },
  });
  if (!i) return { status: "draft", reason: "", submittedAt: null, resumeFile: null };
  return {
    status: i.submittedAt ? i.reviewStatus : "draft",
    reason: i.rejectionReason ?? "",
    submittedAt: i.submittedAt,
    resumeFile: i.resumeFile
      ? { id: i.resumeFile.id, name: i.resumeFile.originalName, url: `/api/files/${i.resumeFile.id}`, uploadedAt: i.resumeFile.createdAt }
      : null,
  };
}
