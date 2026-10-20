"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type CorporationKind } from "@/generated/prisma/client";
import { requireStaffForAction } from "@/server/auth/staff";
import { audit } from "@/server/admin/audit";
import {
  INVALID_INPUT,
  bool,
  emailStr,
  idStr,
  int,
  parseForm,
  parseId,
  reqStr,
  str,
  type ActionState,
  redirectTarget,
} from "@/server/admin/form";
import {
  createCorporation,
  deleteCorporation,
  getCorporation,
  updateCorporation,
} from "@/server/admin/corporations";

const listPath = (kind: CorporationKind) => (kind === "company" ? "/admin/companies" : "/admin/schools");

// Only the labels differ between the two screens (ERR0002: 会社名 / 学校名が入力されていません).
const corporationSchema = (kind: CorporationKind) =>
  z.object({
    id: idStr.optional(),
    email: reqStr("ログインID（メールアドレス）", 254).pipe(z.email("メールアドレスの形式が正しくありません")),
    name: reqStr(kind === "company" ? "会社名" : "学校名", 120),
    nameKana: str(120),
    founded: str(50),
    representative: reqStr("代表者名", 80),
    capitalManYen: int(0, 2_000_000_000),
    headcount: int(0, 2_000_000_000),
    industry: str(120),
    url: str(200),
    postalCode: str(20),
    prefecture: str(50),
    city: str(50),
    town: str(50),
    addressLine: str(50),
    contactPerson: str(80),
    phone: str(20),
    contactEmail: emailStr,
    introduction: str(4000),
    isCompany: bool,
    isSupervisingOrg: bool,
    isRegisteredSupportOrg: bool,
    isUniversity: bool,
    isVocationalSchool: bool,
    isLanguageSchool: bool,
    isActive: bool,
  });

/** BHALO804 / 808 [更新]: creates when there is no id, otherwise updates. */
async function saveCorporation(kind: CorporationKind, formData: FormData): Promise<ActionState> {
  const staff = await requireStaffForAction("edit");

  const parsed = parseForm(corporationSchema(kind), formData);
  if (parsed.errors) return { errors: parsed.errors, message: INVALID_INPUT };
  const { id, ...data } = parsed.data;

  // 対象種別 (BHALO110): at least one flag of this kind, as the table's CHECK
  // constraint demands. The other kind's flags are never set from this screen.
  const input =
    kind === "company"
      ? { ...data, isUniversity: false, isVocationalSchool: false, isLanguageSchool: false }
      : { ...data, isCompany: false, isSupervisingOrg: false, isRegisteredSupportOrg: false };
  const anyChecked =
    kind === "company"
      ? input.isCompany || input.isSupervisingOrg || input.isRegisteredSupportOrg
      : input.isUniversity || input.isVocationalSchool || input.isLanguageSchool;
  if (!anyChecked) {
    const field = kind === "company" ? "isCompany" : "isUniversity";
    return { errors: { [field]: "対象種別が選択されていません" }, message: INVALID_INPUT };
  }

  let corporationId: bigint;
  try {
    if (id) {
      corporationId = BigInt(id);
      if (!(await getCorporation(kind, corporationId))) return { message: "対象データがありません。" };
      await updateCorporation(corporationId, input);
      await audit(staff.id, "update", "corporations", corporationId);
    } else {
      corporationId = await createCorporation(kind, input);
      await audit(staff.id, "create", "corporations", corporationId);
    }
  } catch (e) {
    // The login ID (users.email) is unique.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { email: "このメールアドレスは既に登録されています" }, message: INVALID_INPUT };
    }
    throw e;
  }

  updateTag("listings");
  redirect(`${listPath(kind)}/${corporationId}?saved=${id ? "1" : "created"}`);
}

/** BHALO803 / 807 [削除]: removes the login, which takes the corporation and its postings with it. */
async function removeCorporation(kind: CorporationKind, formData: FormData) {
  const staff = await requireStaffForAction("delete");
  const id = parseId(String(formData.get("id") ?? ""));
  if (!id) return;
  if (!(await deleteCorporation(kind, id))) return;
  await audit(staff.id, "delete", "corporations", id);
  updateTag("listings");
  revalidatePath(listPath(kind));
  const to = redirectTarget(formData);
  if (to) redirect(to);
}

export async function saveCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return saveCorporation("company", formData);
}

export async function saveSchoolAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return saveCorporation("school", formData);
}

export async function deleteCompanyAction(formData: FormData) {
  await removeCorporation("company", formData);
}

export async function deleteSchoolAction(formData: FormData) {
  await removeCorporation("school", formData);
}
