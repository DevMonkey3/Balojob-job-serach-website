"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { JobTrack, SchoolCategory } from "@/generated/prisma/client";
import { requireCandidate } from "@/server/auth/member";
import { dateStr, emailStr, int, reqStr, str, toDate, toMonth, yesNo } from "@/server/admin/form";
import { buildSection, type RawRow } from "@/server/admin/member-rows";
import { replaceJobWishRows, replaceSectionRows, replaceStudyWishRows } from "@/server/admin/members";
import { db } from "@/server/db";
import { sswTestLabels, universityLevelLabels } from "@/lib/admin/labels";
import { flows } from "@/lib/flows";
import type { Row, Values } from "@/lib/wizard/types";

// Saves one step of the candidate wizard (BHALO010–026) to the database. The
// wizard keeps its own field names (src/lib/flows/individual.ts); this file
// translates them to the columns and reuses the admin console's row validation.

export type StepPayload = { values?: Values; rows?: Row[] };
export type StepResult = { ok: true } | { ok: false; message: string; errors?: Record<string, string> };

const INVALID = "入力内容を確認してください。";

const basicSchema = z.object({
  name: reqStr("氏名", 80),
  gender: str(20),
  birthDate: dateStr,
  hasSpouse: yesNo,
  hasChildren: yesNo,
  childCount: int(0, 99),
});

const addressSchema = z.object({
  residenceCountry: str(80),
  nationality: str(80),
  nativeLanguage: str(80),
  mobile: str(20),
  email: emailStr,
  postalCode: str(20),
  state: str(50),
  city: str(50),
  street: str(50),
  houseNumber: str(20),
});

const visaSchema = z
  .object({ visaStatus: str(40), visaExpiryYear: str(4), visaExpiryMonth: str(2) })
  .refine(
    (v) => {
      const filled = [v.visaStatus, v.visaExpiryYear, v.visaExpiryMonth].filter(Boolean).length;
      return filled === 0 || filled === 3;
    },
    { path: ["visaStatus"], message: "入力内容が正しくありません (ステータス・年・月をすべて入力してください)" },
  );

const introductionSchema = z.object({ introduction: str(4000) });

const preferencesSchema = z.object({
  engineer: z.boolean().default(false),
  ssw: z.boolean().default(false),
  titp: z.boolean().default(false),
  university: z.boolean().default(false),
  vocational: z.boolean().default(false),
  languageSchool: z.boolean().default(false),
});

/** "2027" + "3" → "2027-03"; both empty → ""; half filled → an invalid string the month check rejects. */
const ym = (year: string | undefined, month: string | undefined) =>
  !year && !month ? "" : `${year ?? ""}-${(month ?? "").padStart(2, "0")}`;

/** The wizard stores the Japanese label; the column is an enum. Keys pass through unchanged. */
const labelToKey = (labels: Record<string, string>, value: string | undefined) =>
  Object.entries(labels).find(([, label]) => label === value)?.[0] ?? value ?? "";

const v = (row: Row, key: string) => row[key] ?? "";

/** Wizard row → the admin editor's field names, so buildSection() can validate it. */
function toSectionRow(slug: string, row: Row): Record<string, string> {
  switch (slug) {
    case "languages":
      return { language: v(row, "language"), level: v(row, "level") };
    case "education":
      return {
        degree: v(row, "degree"),
        schoolName: v(row, "school"),
        enrolledOn: ym(row.enrolledYear, row.enrolledMonth),
        graduatedOn: ym(row.graduatedYear, row.graduatedMonth),
        passedOn: ym(row.passedYear, row.passedMonth),
        major: v(row, "major"),
      };
    case "work":
      return {
        companyName: v(row, "company"),
        industry: v(row, "industry"),
        joinedOn: ym(row.joinedYear, row.joinedMonth),
        leftOn: ym(row.leftYear, row.leftMonth),
      };
    case "certifications":
      return { name: v(row, "name"), certificateTitle: v(row, "certificate"), acquiredOn: ym(row.acquiredYear, row.acquiredMonth) };
    case "regions":
      return { country: v(row, "country"), region: v(row, "region"), prefecture: v(row, "prefecture"), city: v(row, "city"), freeText: v(row, "free") };
    case "engineer":
    case "ssw":
    case "titp":
      return {
        track: slug,
        desiredJob: v(row, "job"),
        desiredSalary: v(row, "salary"),
        yearsOfStay: v(row, "years"),
        sswTest: slug === "ssw" ? labelToKey(sswTestLabels, row.test) : "",
        notes: v(row, "notes"),
      };
    case "university":
      return {
        schoolCategory: "university",
        universityLevel: labelToKey(universityLevelLabels, row.type),
        schoolName: v(row, "school"),
        faculty: v(row, "faculty"),
        department: v(row, "department"),
        notes: v(row, "notes"),
      };
    case "vocational":
      return { schoolCategory: "vocational", schoolName: v(row, "school"), faculty: v(row, "faculty"), department: v(row, "department"), notes: v(row, "notes") };
    case "language-school":
      return { schoolCategory: "language_school", schoolName: v(row, "school"), notes: v(row, "notes") };
    default:
      return {};
  }
}

const rowSections = {
  languages: "languages",
  education: "educations",
  work: "workExperiences",
  certifications: "certifications",
  regions: "preferredAreas",
  engineer: "jobWishes",
  ssw: "jobWishes",
  titp: "jobWishes",
  university: "studyWishes",
  vocational: "studyWishes",
  "language-school": "studyWishes",
} as const;

type RowSlug = keyof typeof rowSections;
const isRowSlug = (slug: string): slug is RowSlug => slug in rowSections;

const studyCategory: Record<string, SchoolCategory> = { university: "university", vocational: "vocational", "language-school": "language_school" };

const fail = (parsed: { errors: Record<string, string> }): StepResult => ({ ok: false, message: INVALID, errors: parsed.errors });

function parse<S extends z.ZodType>(schema: S, values: Values): { data: z.output<S> } | { errors: Record<string, string> } {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { errors };
}

export async function saveProfileStepAction(slug: string, payload: StepPayload): Promise<StepResult> {
  const member = await requireCandidate();
  const individualId = BigInt(member.individualId);
  if (!flows.individual.steps.some((s) => s.slug === slug)) return { ok: false, message: "不明なステップです。" };

  if (isRowSlug(slug)) {
    const raw: RawRow[] = (payload.rows ?? [])
      .map((row, index) => ({ index, values: toSectionRow(slug, row) }))
      .filter(({ values }) => Object.values(values).some((x) => x.trim() !== "" && !["track", "schoolCategory"].includes(x)))
      // A row counts as empty when only the fixed track/category key is set.
      .filter(({ values }) =>
        Object.entries(values).some(([k, x]) => !["track", "schoolCategory"].includes(k) && x.trim() !== ""),
      );
    const built = buildSection(rowSections[slug], raw);
    if (built.errors) return { ok: false, message: INVALID, errors: built.errors };

    const p = built.payload;
    if (p.section === "jobWishes") await replaceJobWishRows(individualId, slug as JobTrack, p.rows);
    else if (p.section === "studyWishes") await replaceStudyWishRows(individualId, studyCategory[slug], p.rows);
    else await replaceSectionRows(individualId, p);
    return { ok: true };
  }

  const values = payload.values ?? {};
  switch (slug) {
    case "basic": {
      const r = parse(basicSchema, values);
      if ("errors" in r) return fail(r);
      await db.$transaction([
        db.individual.update({
          where: { id: individualId },
          data: {
            fullName: r.data.name,
            gender: r.data.gender ?? null,
            birthDate: toDate(r.data.birthDate),
            hasSpouse: r.data.hasSpouse ?? null,
            hasChildren: r.data.hasChildren ?? null,
            childrenCount: r.data.childCount ?? null,
          },
        }),
        db.user.update({ where: { id: member.userId }, data: { name: r.data.name.slice(0, 80) } }),
      ]);
      return { ok: true };
    }
    case "address": {
      const r = parse(addressSchema, values);
      if ("errors" in r) return fail(r);
      const { email, ...rest } = r.data;
      await db.individual.update({
        where: { id: individualId },
        data: {
          residenceCountry: rest.residenceCountry ?? null,
          nationality: rest.nationality ?? null,
          nativeLanguage: rest.nativeLanguage ?? null,
          mobile: rest.mobile ?? null,
          contactEmail: email ?? null,
          postalCode: rest.postalCode ?? null,
          state: rest.state ?? null,
          city: rest.city ?? null,
          street: rest.street ?? null,
          houseNumber: rest.houseNumber ?? null,
        },
      });
      return { ok: true };
    }
    case "photo":
      // The photo itself is stored by uploadPhotoAction; nothing else on this step.
      return { ok: true };
    case "visa": {
      const r = parse(visaSchema, values);
      if ("errors" in r) return fail(r);
      const expiry = ym(r.data.visaExpiryYear, r.data.visaExpiryMonth);
      if (expiry && !/^\d{4}-(0[1-9]|1[0-2])$/.test(expiry)) {
        return { ok: false, message: INVALID, errors: { visaExpiry: "年月の形式が正しくありません" } };
      }
      await db.individual.update({
        where: { id: individualId },
        data: { visaStatus: r.data.visaStatus ?? null, visaExpiry: toMonth(expiry || undefined) },
      });
      return { ok: true };
    }
    case "introduction": {
      const r = parse(introductionSchema, values);
      if ("errors" in r) return fail(r);
      await db.individual.update({ where: { id: individualId }, data: { introduction: r.data.introduction ?? null } });
      return { ok: true };
    }
    case "preferences": {
      const r = parse(preferencesSchema, values);
      if ("errors" in r) return fail(r);
      await db.individual.update({
        where: { id: individualId },
        data: {
          wantsEngineer: r.data.engineer,
          wantsSsw: r.data.ssw,
          wantsTitp: r.data.titp,
          wantsUniversity: r.data.university,
          wantsVocational: r.data.vocational,
          wantsLanguageSchool: r.data.languageSchool,
        },
      });
      return { ok: true };
    }
    default:
      return { ok: false, message: "不明なステップです。" };
  }
}

/** The wizard's last button (登録してマイページへ): asks staff to review the profile. */
export async function submitProfileAction(): Promise<StepResult> {
  const member = await requireCandidate();
  const individualId = BigInt(member.individualId);
  const i = await db.individual.findUnique({
    where: { id: individualId },
    select: { fullName: true, gender: true, birthDate: true },
  });
  if (!i || !i.fullName.trim() || !i.gender || !i.birthDate) {
    return { ok: false, message: "基本情報（氏名・性別・生年月日）を入力してから登録してください。" };
  }
  await db.individual.update({
    where: { id: individualId },
    data: { reviewStatus: "pending", submittedAt: new Date(), reviewedAt: null, reviewedById: null, rejectionReason: null },
  });
  revalidatePath("/mypage");
  revalidatePath("/admin/reviews");
  return { ok: true };
}
