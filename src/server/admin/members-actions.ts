"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaffForAction } from "@/server/auth/staff";
import { audit } from "@/server/admin/audit";
import {
  INVALID_INPUT,
  bool,
  dateStr,
  decimal,
  emailStr,
  idStr,
  int,
  monthStr,
  parseForm,
  parseId,
  reqStr,
  str,
  yesNo,
  type ActionState,
  redirectTarget,
} from "@/server/admin/form";
import {
  EmailTakenError,
  createMember,
  deleteMember,
  memberExists,
  replaceSectionRows,
  updateMember,
} from "@/server/admin/members";
import { encryptString, encryptionConfigured } from "@/server/crypto";
import { buildSection, collectRows } from "@/server/admin/member-rows";
import { sectionKeys } from "@/lib/admin/member-sections";

const EMAIL_TAKEN = "このメールアドレスは既に登録されています";

/** Required email: the login ID. */
const reqEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
  z
    .email({
      error: (issue) =>
        issue.input === undefined ? "ログインID（メールアドレス）が入力されていません" : "メールアドレスの形式が正しくありません",
    })
    .max(254, "254文字以内で入力してください"),
);

const memberSchema = z.object({
  id: idStr.optional(),
  email: reqEmail,
  // 基本情報 (BHALO010)
  fullName: reqStr("氏名", 80),
  nameKana: str(120),
  gender: str(20),
  birthDate: dateStr,
  hasSpouse: yesNo,
  hasChildren: yesNo,
  childrenCount: int(0, 99),
  // 住所情報 (BHALO011)
  residenceCountry: str(80),
  nationality: str(80),
  nativeLanguage: str(80),
  mobile: str(20),
  contactEmail: emailStr,
  postalCode: str(20),
  state: str(50),
  city: str(50),
  street: str(50),
  houseNumber: str(20),
  // VISA (BHALO013)
  visaStatus: str(40),
  visaExpiry: monthStr,
  // 自己紹介 (BHALO018)
  introduction: str(4000),
  // 求職希望・留学希望 (BHALO019)
  wantsEngineer: bool,
  wantsSsw: bool,
  wantsTitp: bool,
  wantsUniversity: bool,
  wantsVocational: bool,
  wantsLanguageSchool: bool,
  isActive: bool,
  // 履歴書 (BHALO201)
  heightCm: decimal(0.1, 999.9),
  weightKg: decimal(0.1, 999.9),
  bloodType: str(8),
  dominantHand: str(10),
  hasTattoo: yesNo,
  tattooLocation: str(50),
  smokes: yesNo,
  passportNo: str(50),
  clearPassport: bool,
  eyesightRight: decimal(0, 99.9),
  eyesightLeft: decimal(0, 99.9),
  alcohol: str(60),
  allergies: str(60),
  religion: str(80),
  sensitiveConsent: bool,
  strengths: str(200),
  weaknesses: str(200),
  motivation: str(300),
  hobbies: str(200),
  otherNotes: str(300),
});

/** BHALO806 [更新]: creates User + Individual when there is no id, otherwise updates. */
export async function saveMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("edit");

  const parsed = parseForm(memberSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const {
    id,
    passportNo,
    clearPassport,
    heightCm,
    weightKg,
    bloodType,
    dominantHand,
    hasTattoo,
    tattooLocation,
    smokes,
    eyesightRight,
    eyesightLeft,
    alcohol,
    allergies,
    religion,
    sensitiveConsent,
    strengths,
    weaknesses,
    motivation,
    hobbies,
    otherNotes,
    ...member
  } = parsed.data;

  // The passport number is stored encrypted. Empty input keeps the stored value.
  let passport: string | null | undefined;
  if (clearPassport) passport = null;
  else if (passportNo) {
    if (!encryptionConfigured()) {
      return {
        errors: { passportNo: "APP_ENCRYPTION_KEY が設定されていないため、パスポート番号は保存できません" },
        message: INVALID_INPUT,
      };
    }
    passport = encryptString(passportNo);
  }

  const input = {
    ...member,
    resume: {
      heightCm,
      weightKg,
      bloodType,
      dominantHand,
      hasTattoo,
      tattooLocation,
      smokes,
      passportNo: passport,
      eyesightRight,
      eyesightLeft,
      alcohol,
      allergies,
      religion,
      sensitiveConsent,
      strengths,
      weaknesses,
      motivation,
      hobbies,
      otherNotes,
    },
  };

  let memberId: bigint;
  try {
    if (id) {
      memberId = BigInt(id);
      if (!(await memberExists(memberId))) return { message: "対象データがありません。" };
      await updateMember(memberId, input);
      await audit(staff.id, "update", "individuals", memberId, { passport: passport === undefined ? "kept" : passport ? "replaced" : "cleared" });
    } else {
      // Entered by staff, so it needs no review.
      const now = new Date();
      memberId = await createMember(input, { reviewStatus: "approved", submittedAt: now, reviewedAt: now, reviewedById: staff.id });
      await audit(staff.id, "create", "individuals", memberId);
    }
  } catch (e) {
    if (e instanceof EmailTakenError) return { errors: { email: EMAIL_TAKEN }, message: INVALID_INPUT };
    throw e;
  }

  revalidatePath("/admin/members");
  redirect(`/admin/members/${memberId}?saved=${id ? "1" : "created"}`);
}

/** BHALO805 [削除]: removes the login, which cascades to the profile and its child rows. */
export async function deleteMemberAction(formData: FormData) {
  const staff = await requireStaffForAction("delete");
  const id = parseId(String(formData.get("id") ?? ""));
  if (!id) return;
  await deleteMember(id);
  await audit(staff.id, "delete", "individuals", id);
  revalidatePath("/admin/members");
  const to = redirectTarget(formData);
  if (to) redirect(to);
}

const sectionSchema = z.object({ individualId: idStr, section: z.enum(sectionKeys) });

/** One child table of BHALO806 (言語スキル, 学歴, …): replaces the member's rows with the editor's rows. */
export async function saveMemberSectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("edit");

  const parsed = parseForm(sectionSchema, formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { individualId, section } = parsed.data;

  const id = BigInt(individualId);
  if (!(await memberExists(id))) return { message: "対象データがありません。" };

  const built = buildSection(section, collectRows(formData));
  if (built.errors) return { errors: built.errors, message: INVALID_INPUT };

  await replaceSectionRows(id, built.payload);
  await audit(staff.id, "update", "individuals", id, { section });

  redirect(`/admin/members/${id}?saved=1#${section}`);
}
