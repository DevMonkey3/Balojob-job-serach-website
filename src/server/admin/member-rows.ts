import "server-only";
import { z } from "zod";
import { dateStr, enumOf, int, monthStr, reqStr, str, toDate, toMonth } from "@/server/admin/form";
import type { SectionPayload } from "@/server/admin/members";
import type { SectionKey } from "@/lib/admin/member-sections";

// Validation of the member's child-table rows (言語, 学歴, 実務経験, …), shared by
// the admin console (BHALO806) and the candidate's own wizard. Rows arrive as
// `rows.<index>.<field>` form fields and leave as the data-layer SectionPayload.

// --- Child-table sections (BHALO014–026, 202) ---------------------------------

export const TRACKS = ["engineer", "ssw", "titp"] as const;
export const SSW_TESTS = ["passed", "in_progress", "not_taken"] as const;
export const SCHOOL_CATEGORIES = ["university", "vocational", "language_school"] as const;
export const UNIVERSITY_LEVELS = ["undergraduate", "graduate"] as const;

/** Required choice from a fixed list. */
export const reqEnum = <const T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z.enum(values, { error: `${label}が選択されていません` }),
  );

const languageSchema = z.object({ language: reqStr("言語", 30), level: str(20) });

const educationSchema = z.object({
  degree: str(80),
  schoolName: str(120),
  enrolledOn: monthStr,
  graduatedOn: monthStr,
  passedOn: monthStr,
  major: str(80),
});

const workExperienceSchema = z
  .object({ companyName: str(80), industry: str(120), joinedOn: monthStr, leftOn: monthStr })
  .refine((r) => !r.joinedOn || !r.leftOn || r.leftOn >= r.joinedOn, {
    path: ["leftOn"],
    message: "退職年月は入社年月以降にしてください",
  });

const certificationSchema = z.object({ name: reqStr("資格名", 120), certificateTitle: str(120), acquiredOn: monthStr });

const preferredAreaSchema = z.object({
  country: str(120),
  region: str(120),
  prefecture: str(120),
  city: str(120),
  freeText: str(300),
});

const jobWishSchema = z.object({
  track: reqEnum(TRACKS, "種別"),
  desiredJob: str(120),
  desiredSalary: str(80),
  yearsOfStay: int(0, 99),
  sswTest: enumOf(SSW_TESTS),
  notes: str(300),
});

const studyWishSchema = z.object({
  schoolCategory: reqEnum(SCHOOL_CATEGORIES, "区分"),
  universityLevel: enumOf(UNIVERSITY_LEVELS),
  schoolName: str(120),
  faculty: str(120),
  department: str(120),
  notes: str(300),
});

const familyMemberSchema = z.object({
  relation: str(50),
  fullName: str(80),
  birthDate: dateStr,
  address: str(120),
  occupation: str(80),
});

export type RawRow = { index: number; values: Record<string, string> };

/** The `rows.<index>.<field>` inputs of a rows editor, in index order, without all-empty rows. */
export function collectRows(formData: FormData): RawRow[] {
  const byIndex = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const m = /^rows\.(\d+)\.(\w+)$/.exec(key);
    if (!m || typeof value !== "string") continue;
    const index = Number(m[1]);
    const row = byIndex.get(index) ?? {};
    row[m[2]] = value;
    byIndex.set(index, row);
  }
  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([, values]) => Object.values(values).some((v) => v.trim() !== ""))
    .map(([index, values]) => ({ index, values }));
}

type Built<R> = { rows: R[]; errors?: undefined } | { rows?: undefined; errors: Record<string, string> };

/** Validates every row; errors keep the row's form index so they land next to the right input. */
function buildRows<S extends z.ZodType, R>(schema: S, raw: RawRow[], toRow: (d: z.output<S>) => R): Built<R> {
  const rows: R[] = [];
  const errors: Record<string, string> = {};
  for (const { index, values } of raw) {
    const result = schema.safeParse(values);
    if (result.success) {
      rows.push(toRow(result.data));
      continue;
    }
    for (const issue of result.error.issues) {
      const key = [`rows.${index}`, ...issue.path].join(".");
      if (!(key in errors)) errors[key] = issue.message;
    }
  }
  return Object.keys(errors).length > 0 ? { errors } : { rows };
}

export type SectionBuild = { payload: SectionPayload; errors?: undefined } | { payload?: undefined; errors: Record<string, string> };

/** Validated rows of one section as the data-layer payload (dates and enums converted). */
export function buildSection(section: SectionKey, raw: RawRow[]): SectionBuild {
  const wrap = <R>(b: Built<R>, make: (rows: R[]) => SectionPayload): SectionBuild =>
    b.errors ? { errors: b.errors } : { payload: make(b.rows) };

  switch (section) {
    case "languages":
      return wrap(
        buildRows(languageSchema, raw, (d) => ({ language: d.language, level: d.level ?? null })),
        (rows) => ({ section, rows }),
      );
    case "educations":
      return wrap(
        buildRows(educationSchema, raw, (d) => ({
          degree: d.degree ?? null,
          schoolName: d.schoolName ?? null,
          enrolledOn: toMonth(d.enrolledOn),
          graduatedOn: toMonth(d.graduatedOn),
          passedOn: toMonth(d.passedOn),
          major: d.major ?? null,
        })),
        (rows) => ({ section, rows }),
      );
    case "workExperiences":
      return wrap(
        buildRows(workExperienceSchema, raw, (d) => ({
          companyName: d.companyName ?? null,
          industry: d.industry ?? null,
          joinedOn: toMonth(d.joinedOn),
          leftOn: toMonth(d.leftOn),
        })),
        (rows) => ({ section, rows }),
      );
    case "certifications":
      return wrap(
        buildRows(certificationSchema, raw, (d) => ({
          name: d.name,
          certificateTitle: d.certificateTitle ?? null,
          acquiredOn: toMonth(d.acquiredOn),
        })),
        (rows) => ({ section, rows }),
      );
    case "preferredAreas":
      return wrap(
        buildRows(preferredAreaSchema, raw, (d) => ({
          country: d.country ?? null,
          region: d.region ?? null,
          prefecture: d.prefecture ?? null,
          city: d.city ?? null,
          freeText: d.freeText ?? null,
        })),
        (rows) => ({ section, rows }),
      );
    case "jobWishes":
      return wrap(
        // The exam status only exists for 特定技能 (DB CHECK); other tracks drop it.
        buildRows(jobWishSchema, raw, (d) => ({
          track: d.track,
          desiredJob: d.desiredJob ?? null,
          desiredSalary: d.desiredSalary ?? null,
          yearsOfStay: d.yearsOfStay ?? null,
          sswTest: d.track === "ssw" ? (d.sswTest ?? null) : null,
          notes: d.notes ?? null,
        })),
        (rows) => ({ section, rows }),
      );
    case "studyWishes":
      return wrap(
        // 大学/院 only applies to 大学・大学院 (DB CHECK); other categories drop it.
        buildRows(studyWishSchema, raw, (d) => ({
          schoolCategory: d.schoolCategory,
          universityLevel: d.schoolCategory === "university" ? (d.universityLevel ?? null) : null,
          schoolName: d.schoolName ?? null,
          faculty: d.faculty ?? null,
          department: d.department ?? null,
          notes: d.notes ?? null,
        })),
        (rows) => ({ section, rows }),
      );
    case "familyMembers":
      return wrap(
        buildRows(familyMemberSchema, raw, (d) => ({
          relation: d.relation ?? null,
          fullName: d.fullName ?? null,
          birthDate: toDate(d.birthDate),
          address: d.address ?? null,
          occupation: d.occupation ?? null,
        })),
        (rows) => ({ section, rows }),
      );
  }
}

