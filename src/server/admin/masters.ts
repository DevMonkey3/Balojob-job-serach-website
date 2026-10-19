import "server-only";
import { Prisma, type AccountType } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { contains } from "@/server/admin/jobs";

// Master maintenance for the admin console (BHALO812–816): 選択項目, ログイン,
// 採番, 人気業種, 管理. Ids leave this module as strings so they can be passed
// to client components.

export type RowsSaveResult = { created: number; updated: number; deleted: number };

/**
 * Splits the rows from a screen into creates, updates and deletes against the
 * ids currently in the database. Null when the screen holds an id that is not
 * there any more (someone else changed the table): nothing should be written.
 */
function diffRows<R extends { id?: string }>(existingIds: bigint[], rows: R[]) {
  const existing = new Set(existingIds.map(String));
  const updates = rows.filter((r): r is R & { id: string } => !!r.id);
  if (updates.some((r) => !existing.has(r.id))) return null;
  const kept = new Set(updates.map((r) => r.id));
  return {
    creates: rows.filter((r) => !r.id),
    updates,
    deletes: existingIds.filter((id) => !kept.has(String(id))),
  };
}

// --- 選択項目マスタ (BHALO812) ------------------------------------------------
// Two levels: level-1 rows have parentId null, level-2 rows point at one of them.

/** Category keys are short identifiers such as "industry" or "visa" (HTML pattern, no anchors). */
export const CATEGORY_PATTERN = "[a-z][a-z0-9_]{1,39}";
export const CATEGORY_RE = new RegExp(`^${CATEGORY_PATTERN}$`);

export type OptionRow = {
  id: string;
  labelJa: string;
  labelEn: string;
  labelBn: string;
  sortOrder: number;
  isActive: boolean;
  /** Level-2 rows under this one (always 0 for a level-2 row). */
  childCount: number;
};

/** One level of a category: the level-1 rows, or the children of `parentId`. */
export async function getOptionRows(category: string, parentId: bigint | null): Promise<OptionRow[]> {
  const rows = await db.selectionOption.findMany({
    where: { category, parentId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { children: true } } },
  });
  return rows.map((r) => ({
    id: String(r.id),
    labelJa: r.labelJa,
    labelEn: r.labelEn ?? "",
    labelBn: r.labelBn ?? "",
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    childCount: r._count.children,
  }));
}

/** A level-1 row of `category`, for the breadcrumb above its children. */
export async function getOptionParent(category: string, id: bigint): Promise<{ id: string; labelJa: string } | null> {
  const row = await db.selectionOption.findFirst({
    where: { id, category, parentId: null },
    select: { id: true, labelJa: true },
  });
  return row ? { id: String(row.id), labelJa: row.labelJa } : null;
}

export type OptionRowInput = {
  id?: string;
  labelJa: string;
  labelEn?: string;
  labelBn?: string;
  sortOrder?: number;
  isActive: boolean;
};

/**
 * Replaces one level with the rows from the screen: rows with an id are
 * updated, rows without one are created, rows no longer on the screen are
 * deleted (their children go with them). Null when the screen was stale.
 */
export async function saveOptionRows(
  category: string,
  parentId: bigint | null,
  rows: OptionRowInput[],
): Promise<RowsSaveResult | null> {
  return db.$transaction(async (tx) => {
    const existing = await tx.selectionOption.findMany({ where: { category, parentId }, select: { id: true } });
    const diff = diffRows(
      existing.map((r) => r.id),
      rows,
    );
    if (!diff) return null;

    if (diff.deletes.length > 0) await tx.selectionOption.deleteMany({ where: { id: { in: diff.deletes } } });
    for (const r of diff.updates) {
      await tx.selectionOption.update({ where: { id: BigInt(r.id) }, data: optionData(r) });
    }
    for (const r of diff.creates) {
      await tx.selectionOption.create({ data: { category, parentId, ...optionData(r) } });
    }
    return { created: diff.creates.length, updated: diff.updates.length, deleted: diff.deletes.length };
  });
}

// Empty labels clear the column (undefined would mean "leave unchanged").
function optionData(r: OptionRowInput) {
  return {
    labelJa: r.labelJa,
    labelEn: r.labelEn ?? null,
    labelBn: r.labelBn ?? null,
    sortOrder: r.sortOrder ?? 0,
    isActive: r.isActive,
  };
}

// --- ログインマスタメンテ (BHALO813) --------------------------------------------

export const LOGIN_PAGE_SIZE = 50;

const ACCOUNT_TYPES: readonly AccountType[] = ["individual", "corporate", "staff"];
export const isAccountType = (v: string | undefined): v is AccountType =>
  !!v && (ACCOUNT_TYPES as readonly string[]).includes(v);

export type LoginFilters = {
  accountType?: string;
  memberNo?: string;
  email?: string;
  /** YYYY-MM-DD: rows last updated on or before that day. */
  updatedBefore?: string;
  page?: number;
};

export type LoginRow = {
  id: string;
  email: string;
  accountType: AccountType;
  memberNo: string;
  /** 氏名 for individuals, 法人名 for corporations, ユーザ名 for staff. */
  displayName: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

/** The last moment of a YYYY-MM-DD day in Japan; undefined when empty or malformed. */
function endOfDayJst(ymd: string | undefined): Date | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  const d = new Date(`${ymd}T23:59:59.999+09:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function listLogins(f: LoginFilters) {
  const memberNo = contains(f.memberNo);
  const updatedBefore = endOfDayJst(f.updatedBefore);
  const where: Prisma.UserWhereInput = {
    accountType: isAccountType(f.accountType) ? f.accountType : undefined,
    email: contains(f.email),
    updatedAt: updatedBefore ? { lte: updatedBefore } : undefined,
    OR: memberNo ? [{ individual: { memberNo } }, { corporation: { memberNo } }] : undefined,
  };
  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * LOGIN_PAGE_SIZE,
      take: LOGIN_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        accountType: true,
        name: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        individual: { select: { memberNo: true, fullName: true } },
        corporation: { select: { memberNo: true, name: true } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / LOGIN_PAGE_SIZE)),
    rows: rows.map(
      (u): LoginRow => ({
        id: u.id,
        email: u.email,
        accountType: u.accountType,
        memberNo: u.individual?.memberNo ?? u.corporation?.memberNo ?? "",
        displayName: u.individual?.fullName ?? u.corporation?.name ?? u.name ?? "",
        emailVerified: u.emailVerified,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLoginAt: u.lastLoginAt,
      }),
    ),
  };
}

export async function getLogin(id: string): Promise<{ id: string; accountType: AccountType; isActive: boolean } | null> {
  return db.user.findUnique({ where: { id }, select: { id: true, accountType: true, isActive: true } });
}

export async function setUserActive(id: string, isActive: boolean) {
  await db.user.update({ where: { id }, data: { isActive } });
}

/** Removes the login and, through the foreign keys, all member data and sessions. */
export async function deleteUser(id: string) {
  await db.user.delete({ where: { id } });
}

// --- 採番マスタメンテ (BHALO814) -----------------------------------------------
// 採番マスタ was replaced by two sequences (the 6-digit part of member numbers)
// and identity columns on every other table.

export const SEQUENCES = ["individual_member_seq", "corporate_member_seq"] as const;
export type SequenceName = (typeof SEQUENCES)[number];

const sequenceInfo: Record<SequenceName, { label: string; prefix: string }> = {
  individual_member_seq: { label: "個人会員番号", prefix: "10" },
  corporate_member_seq: { label: "法人会員番号", prefix: "20" },
};

/** The 6-digit part cannot go beyond this. */
export const SEQUENCE_MAX = 999_999;

// A relation name cannot be a bind parameter, so each sequence has its own literal query.
const sequenceQueries: Record<SequenceName, Prisma.Sql> = {
  individual_member_seq: Prisma.sql`SELECT last_value, is_called FROM individual_member_seq`,
  corporate_member_seq: Prisma.sql`SELECT last_value, is_called FROM corporate_member_seq`,
};

export type SequenceState = {
  name: SequenceName;
  label: string;
  /** last_value as PostgreSQL reports it. */
  lastValue: number;
  /** False before the first nextval() or after setval(…, false): the next number is lastValue itself. */
  isCalled: boolean;
  /** What the next nextval() returns. */
  next: number;
  /** The member number the next registration gets (month = today in Japan). */
  nextMemberNo: string;
};

/** YYMM in Japan, the same format the column default uses. */
function yymmJst(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${String(jst.getUTCFullYear()).slice(-2)}${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getSequenceState(name: SequenceName): Promise<SequenceState> {
  const [row] = await db.$queryRaw<{ last_value: bigint | number; is_called: boolean }[]>(sequenceQueries[name]);
  if (!row) throw new Error(`Sequence ${name} not found`);
  const lastValue = Number(row.last_value);
  const next = row.is_called ? lastValue + 1 : lastValue;
  const { label, prefix } = sequenceInfo[name];
  return {
    name,
    label,
    lastValue,
    isCalled: row.is_called,
    next,
    nextMemberNo: `${prefix}${yymmJst()}${String(next).padStart(6, "0")}`,
  };
}

export const getSequenceStates = () => Promise.all(SEQUENCES.map(getSequenceState));

/**
 * Makes `value` the next number the sequence hands out. Only forwards: going
 * back would repeat member numbers. The name is one of SEQUENCES and is bound
 * as a parameter, never spliced into the SQL. Null when `value` is not ahead.
 */
export async function setSequenceNext(name: SequenceName, value: number): Promise<{ from: number } | null> {
  const current = await getSequenceState(name);
  if (value <= current.lastValue) return null;
  await db.$executeRaw`SELECT setval(${name}::regclass, ${value}::bigint, false)`;
  return { from: current.next };
}

export type TableCount = { table: string; label: string; count: number };

// The rows the spec's 採番マスタ listed. Their keys are identity columns now.
const countedTables = [
  { table: "individuals", label: "個人会員情報", count: () => db.individual.count() },
  { table: "corporations", label: "法人会員情報", count: () => db.corporation.count() },
  { table: "individual_languages", label: "言語", count: () => db.individualLanguage.count() },
  { table: "individual_educations", label: "学歴", count: () => db.individualEducation.count() },
  { table: "individual_work_experiences", label: "実務経験", count: () => db.individualWorkExperience.count() },
  { table: "individual_certifications", label: "認定資格", count: () => db.individualCertification.count() },
  { table: "individual_preferred_areas", label: "希望地域", count: () => db.individualPreferredArea.count() },
  { table: "individual_job_wishes", label: "技人国・特定技能・技能実習", count: () => db.individualJobWish.count() },
  { table: "individual_study_wishes", label: "大学大学院・専門学校・日本語学校", count: () => db.individualStudyWish.count() },
  { table: "job_postings", label: "求人情報", count: () => db.jobPosting.count() },
  { table: "job_orders", label: "求人票", count: () => db.jobOrder.count() },
  { table: "resumes", label: "履歴書", count: () => db.resume.count() },
  { table: "family_members", label: "家族構成", count: () => db.familyMember.count() },
  { table: "recruitments", label: "生徒募集", count: () => db.recruitment.count() },
];

export async function getTableCounts(): Promise<TableCount[]> {
  const counts = await Promise.all(countedTables.map((t) => t.count()));
  return countedTables.map((t, i) => ({ table: t.table, label: t.label, count: counts[i] }));
}

// --- 人気業種マスタ (BHALO815) ------------------------------------------------

export type IndustryRow = { id: string; labelJa: string; labelEn: string; sortOrder: number };

/** Every row, for the editor. The public list is the cached getPopularIndustries() in listings.ts. */
export async function getIndustryRows(): Promise<IndustryRow[]> {
  const rows = await db.popularIndustry.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  return rows.map((r) => ({ id: String(r.id), labelJa: r.labelJa, labelEn: r.labelEn ?? "", sortOrder: r.sortOrder }));
}

export type IndustryRowInput = { id?: string; labelJa: string; labelEn?: string; sortOrder?: number };

/** Same contract as saveOptionRows. */
export async function saveIndustryRows(rows: IndustryRowInput[]): Promise<RowsSaveResult | null> {
  return db.$transaction(async (tx) => {
    const existing = await tx.popularIndustry.findMany({ select: { id: true } });
    const diff = diffRows(
      existing.map((r) => r.id),
      rows,
    );
    if (!diff) return null;

    const data = (r: IndustryRowInput) => ({ labelJa: r.labelJa, labelEn: r.labelEn ?? null, sortOrder: r.sortOrder ?? 0 });
    if (diff.deletes.length > 0) await tx.popularIndustry.deleteMany({ where: { id: { in: diff.deletes } } });
    for (const r of diff.updates) await tx.popularIndustry.update({ where: { id: BigInt(r.id) }, data: data(r) });
    for (const r of diff.creates) await tx.popularIndustry.create({ data: data(r) });
    return { created: diff.creates.length, updated: diff.updates.length, deleted: diff.deletes.length };
  });
}

// --- 管理マスタメンテ (BHALO816) -----------------------------------------------

/** Where コンタクト申込 (BHALO200) emails go. The form fields use these keys as names. */
export const SETTING_KEYS = ["application_email_individual", "application_email_corporate"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export type SettingValues = Record<SettingKey, string>;

export type SiteSettingRow = { key: string; value: string; updatedAt: Date };

export async function getSiteSettings(): Promise<{ values: SettingValues; others: SiteSettingRow[] }> {
  const rows = await db.siteSetting.findMany({ orderBy: { key: "asc" } });
  const values: SettingValues = { application_email_individual: "", application_email_corporate: "" };
  const others: SiteSettingRow[] = [];
  for (const r of rows) {
    if ((SETTING_KEYS as readonly string[]).includes(r.key)) values[r.key as SettingKey] = r.value;
    else others.push(r);
  }
  return { values, others };
}

export async function saveSiteSettings(values: SettingValues) {
  await db.$transaction(
    SETTING_KEYS.map((key) =>
      db.siteSetting.upsert({ where: { key }, create: { key, value: values[key] }, update: { value: values[key] } }),
    ),
  );
}
