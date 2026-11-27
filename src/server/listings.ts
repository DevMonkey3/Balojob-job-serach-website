import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import {
  jobTrackLabels,
  schoolCategoryLabels,
  type JobTrackLabel,
  type SchoolCategoryLabel,
} from "@/lib/format";

// Public listings: the top page, 求人検索 (/jobs), a job's page and My Page.
// Results are cached for a few minutes and shared by every visitor. Code that
// changes postings should call updateTag("listings").
//
// What a visitor may know about a company is its name and its 許可・登録番号,
// nothing else: no address, phone, email or contact person. Introductions go
// through staff, so those columns are never selected here.
//
// Callers read these at request time (after connection()), so `next build`
// never needs the database.

export type JobTrackKey = keyof typeof jobTrackLabels;

export type Job = {
  id: string;
  corporateNo: string;
  jobNo: number;
  company: string;
  /** 許可・登録番号. "" when the company has none on file. */
  licenseNo: string;
  track: JobTrackKey;
  category: JobTrackLabel;
  industry: string;
  jobType: string;
  workName: string;
  employmentType: string;
  description: string;
  features: string;
  location: string;
  /** "08:00〜17:30", or "" when not entered. */
  hours: string;
  holidays: string;
  /** 円/月. Null until the company enters it. */
  salary: number | null;
  /** YYYY/MM/DD in Japan time. */
  postedOn: string;
  /** When it was posted and last changed, as ISO 8601 (structured data, sitemap). */
  postedAt: string;
  updatedAt: string;
  /** Posted in the last 14 days. */
  isNew: boolean;
};

export type JobDetail = Job & {
  breakTime: string;
  weeklyWorkDays: string;
  /** "1日2時間 / 月平均20時間" style, or "". */
  overtime: string;
  japaneseLevel: string;
  /** 雇用保険, 労災保険 … the ones the company ticked. */
  insurance: string[];
  commute: string;
};

export type Recruitment = {
  id: string;
  corporateNo: string;
  recruitmentNo: number;
  school: string;
  /** From the school's 対象選択. Usually one, but a school can tick several. */
  categories: SchoolCategoryLabel[];
  schoolGender: string;
  faculty: string;
  department: string;
  location: string;
  capacity: number | null;
  tuition: number | null;
  notes: string;
};

export type PopularIndustry = { ja: string; en: string };

// A posting is listed only while it is approved by staff and both it and its
// company or school are active.
const listed = { isActive: true, reviewStatus: "approved", corporation: { isActive: true } } as const;
// Recruitments have no review step yet (schools are outside the MVP).
const listedRecruitment = { isActive: true, corporation: { isActive: true } } as const;

const NEW_DAYS = 14;
const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** A TIME column arrives as 1970-01-01T08:00:00Z. */
const hhmm = (t: Date | null) => (t ? t.toISOString().slice(11, 16) : "");

const jobSelect = {
  id: true,
  jobNo: true,
  track: true,
  industry: true,
  jobType: true,
  workName: true,
  employmentType: true,
  description: true,
  features: true,
  location: true,
  hoursFrom: true,
  hoursTo: true,
  holidays: true,
  monthlySalary: true,
  createdAt: true,
  updatedAt: true,
  corporation: { select: { memberNo: true, name: true, licenseNo: true } },
} satisfies Prisma.JobPostingSelect;

type JobRow = Prisma.JobPostingGetPayload<{ select: typeof jobSelect }>;

function toJob(j: JobRow): Job {
  const from = hhmm(j.hoursFrom);
  const to = hhmm(j.hoursTo);
  return {
    id: String(j.id),
    corporateNo: j.corporation.memberNo,
    jobNo: j.jobNo,
    company: j.corporation.name,
    licenseNo: j.corporation.licenseNo ?? "",
    track: j.track,
    category: jobTrackLabels[j.track],
    industry: j.industry ?? "",
    jobType: j.jobType ?? "",
    workName: j.workName ?? "",
    employmentType: j.employmentType ?? "",
    description: j.description ?? "",
    features: j.features ?? "",
    location: j.location ?? "",
    hours: from || to ? `${from}〜${to}` : "",
    holidays: j.holidays ?? "",
    salary: j.monthlySalary,
    postedOn: dateFormat.format(j.createdAt),
    postedAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
    isNew: Date.now() - j.createdAt.getTime() < NEW_DAYS * 24 * 60 * 60 * 1000,
  };
}

function schoolCategories(school: {
  isUniversity: boolean;
  isVocationalSchool: boolean;
  isLanguageSchool: boolean;
}) {
  const categories: SchoolCategoryLabel[] = [];
  if (school.isUniversity) categories.push(schoolCategoryLabels.university);
  if (school.isVocationalSchool) categories.push(schoolCategoryLabels.vocational);
  if (school.isLanguageSchool) categories.push(schoolCategoryLabels.language_school);
  return categories;
}

/** Every listed job (newest first) and every listed recruitment. */
export async function getListings(): Promise<{ jobs: Job[]; recruitments: Recruitment[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");

  const [jobs, recruitments] = await Promise.all([
    db.jobPosting.findMany({
      where: listed,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: jobSelect,
    }),
    db.recruitment.findMany({
      where: listedRecruitment,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        recruitmentNo: true,
        faculty: true,
        department: true,
        schoolGender: true,
        location: true,
        capacity: true,
        annualTuition: true,
        notes: true,
        corporation: {
          select: {
            memberNo: true,
            name: true,
            isUniversity: true,
            isVocationalSchool: true,
            isLanguageSchool: true,
          },
        },
      },
    }),
  ]);

  return {
    jobs: jobs.map(toJob),
    recruitments: recruitments.map((r) => ({
      id: String(r.id),
      corporateNo: r.corporation.memberNo,
      recruitmentNo: r.recruitmentNo,
      school: r.corporation.name,
      categories: schoolCategories(r.corporation),
      schoolGender: r.schoolGender ?? "",
      faculty: r.faculty ?? "",
      department: r.department ?? "",
      location: r.location ?? "",
      capacity: r.capacity,
      tuition: r.annualTuition,
      notes: r.notes ?? "",
    })),
  };
}

// ---------------------------------------------------------------------------
// 求人検索 (/jobs)
// ---------------------------------------------------------------------------

export type JobFilters = {
  track?: JobTrackKey;
  industry?: string;
  employment?: string;
  /** Free words: every word must appear in the job type, work, description, features or company name. */
  q?: string;
  /** Part of the 勤務地, e.g. "横浜". */
  location?: string;
  /** 月給 at least this many yen. */
  minSalary?: number;
};

export const JOBS_PER_PAGE = 20;

function jobWhere(f: JobFilters): Prisma.JobPostingWhereInput {
  const and: Prisma.JobPostingWhereInput[] = [listed];
  if (f.track) and.push({ track: f.track });
  if (f.industry) and.push({ industry: f.industry });
  if (f.employment) and.push({ employmentType: f.employment });
  if (f.minSalary) and.push({ monthlySalary: { gte: f.minSalary } });
  if (f.location) and.push({ location: { contains: f.location, mode: "insensitive" } });
  for (const word of (f.q ?? "").split(/[\s　]+/).filter(Boolean).slice(0, 5)) {
    const has = { contains: word, mode: "insensitive" } as const;
    and.push({
      OR: [
        { jobType: has },
        { workName: has },
        { description: has },
        { features: has },
        { industry: has },
        { corporation: { name: has } },
      ],
    });
  }
  return { AND: and };
}

export type JobSearchResult = { total: number; jobs: Job[] };

async function runSearch(filters: JobFilters, page: number): Promise<JobSearchResult> {
  const where = jobWhere(filters);
  const [total, rows] = await Promise.all([
    db.jobPosting.count({ where }),
    db.jobPosting.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * JOBS_PER_PAGE,
      take: JOBS_PER_PAGE,
      select: jobSelect,
    }),
  ]);
  return { total, jobs: rows.map(toJob) };
}

async function cachedSearch(filters: JobFilters, page: number): Promise<JobSearchResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  return runSearch(filters, page);
}

/**
 * One page of listed jobs. Searches made only of dropdown values are shared
 * from the cache; free-text searches go straight to the database (there are
 * too many different ones to be worth keeping).
 */
export function searchJobs(filters: JobFilters, page: number): Promise<JobSearchResult> {
  return filters.q || filters.location ? runSearch(filters, page) : cachedSearch(filters, page);
}

/** One listed job with its 求人票 details, or null (unknown, not approved, or closed). */
export async function getPublicJob(id: string): Promise<JobDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");

  if (!/^\d{1,18}$/.test(id)) return null;
  const row = await db.jobPosting.findFirst({
    where: { id: BigInt(id), ...listed },
    select: {
      ...jobSelect,
      jobOrder: {
        select: {
          breakTime: true,
          weeklyWorkDays: true,
          overtimeDailyHours: true,
          overtimeMonthlyAvgHours: true,
          japaneseLevel: true,
          hasEmploymentInsurance: true,
          hasWorkersComp: true,
          hasHealthInsurance: true,
          hasPension: true,
          commuteFull: true,
          commuteFixed: true,
        },
      },
    },
  });
  if (!row) return null;

  const o = row.jobOrder;
  const overtime = [
    o?.overtimeDailyHours ? `1日${o.overtimeDailyHours}時間` : "",
    o?.overtimeMonthlyAvgHours ? `月平均${o.overtimeMonthlyAvgHours}時間` : "",
  ].filter(Boolean);
  const insurance = [
    o?.hasEmploymentInsurance && "雇用保険",
    o?.hasWorkersComp && "労災保険",
    o?.hasHealthInsurance && "健康保険",
    o?.hasPension && "厚生年金",
  ].filter((v): v is string => typeof v === "string");

  return {
    ...toJob(row),
    breakTime: o?.breakTime ?? "",
    weeklyWorkDays: o?.weeklyWorkDays ?? "",
    overtime: overtime.join(" / "),
    japaneseLevel: o?.japaneseLevel ?? "",
    insurance,
    commute: o?.commuteFull ? "全額支給" : o?.commuteFixed ? "定額支給" : "",
  };
}

export type Facet = { label: string; count: number };

export type JobFacets = {
  total: number;
  newCount: number;
  /** Date of the newest listed job (YYYY/MM/DD), "" when there are none. */
  updatedOn: string;
  industries: Facet[];
  prefectures: Facet[];
  employment: Facet[];
};

const PREFECTURE = /^(北海道|東京都|(?:京都|大阪)府|[^\s　]{2,3}県)/;

function tally(values: string[]): Facet[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
}

/** Counts behind the "〜から探す" tiles and the search form's dropdowns. */
export async function getJobFacets(): Promise<JobFacets> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");

  const { jobs } = await getListings();
  return {
    total: jobs.length,
    newCount: jobs.filter((j) => j.isNew).length,
    updatedOn: jobs[0]?.postedOn ?? "",
    industries: tally(jobs.map((j) => j.industry)),
    prefectures: tally(jobs.map((j) => j.location.match(PREFECTURE)?.[1] ?? "")),
    employment: tally(jobs.map((j) => j.employmentType)),
  };
}

/** Listed job postings per 種別, and listed recruitments per school category. */
export async function getListingCounts(): Promise<{
  jobs: Record<JobTrackLabel, number>;
  schools: Record<SchoolCategoryLabel, number>;
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");

  const countSchools = (flag: "isUniversity" | "isVocationalSchool" | "isLanguageSchool") =>
    db.recruitment.count({ where: { isActive: true, corporation: { isActive: true, [flag]: true } } });

  const [byTrack, university, vocational, languageSchool] = await Promise.all([
    db.jobPosting.groupBy({ by: ["track"], where: listed, _count: { _all: true } }),
    countSchools("isUniversity"),
    countSchools("isVocationalSchool"),
    countSchools("isLanguageSchool"),
  ]);

  const jobs = { 技人国: 0, 特定技能: 0, 育成就労: 0 } satisfies Record<JobTrackLabel, number>;
  for (const group of byTrack) jobs[jobTrackLabels[group.track]] = group._count._all;

  return {
    jobs,
    schools: { "大学・大学院": university, 専門学校: vocational, 日本語学校: languageSchool },
  };
}

/** 人気業種, in the order staff set. */
export async function getPopularIndustries(): Promise<PopularIndustry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("popular-industries");

  const rows = await db.popularIndustry.findMany({
    orderBy: { sortOrder: "asc" },
    select: { labelJa: true, labelEn: true },
  });
  return rows.map((r) => ({ ja: r.labelJa, en: r.labelEn ?? "" }));
}
