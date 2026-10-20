import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import {
  jobTrackLabels,
  schoolCategoryLabels,
  type JobTrackLabel,
  type SchoolCategoryLabel,
} from "@/lib/format";

// Public listings for the top page and My Page (BHALO200). Results are cached
// for a few minutes and shared by every visitor. Code that changes postings
// should call updateTag("listings").
//
// Callers read these at request time (after connection()), so `next build`
// never needs the database.

export type Job = {
  id: string;
  corporateNo: string;
  jobNo: number;
  company: string;
  category: JobTrackLabel;
  industry: string;
  jobType: string;
  location: string;
  /** 円/月. Null until the company enters it. */
  salary: number | null;
};

export type Recruitment = {
  id: string;
  corporateNo: string;
  recruitmentNo: number;
  school: string;
  /** From the school's 対象選択 (BHALO110). Usually one, but a school can tick several. */
  categories: SchoolCategoryLabel[];
  schoolGender: string;
  faculty: string;
  department: string;
  location: string;
  capacity: number | null;
  tuition: number | null;
};

export type PopularIndustry = { ja: string; en: string };

// A posting is listed only while it is approved by staff and both it and its
// company or school are active.
const listed = { isActive: true, reviewStatus: "approved", corporation: { isActive: true } } as const;
// Recruitments have no review step yet (schools are outside the MVP).
const listedRecruitment = { isActive: true, corporation: { isActive: true } } as const;

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

export async function getListings(): Promise<{ jobs: Job[]; recruitments: Recruitment[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");

  const [jobs, recruitments] = await Promise.all([
    db.jobPosting.findMany({
      where: listed,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jobNo: true,
        track: true,
        industry: true,
        jobType: true,
        location: true,
        monthlySalary: true,
        corporation: { select: { memberNo: true, name: true } },
      },
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
    jobs: jobs.map((j) => ({
      id: String(j.id),
      corporateNo: j.corporation.memberNo,
      jobNo: j.jobNo,
      company: j.corporation.name,
      category: jobTrackLabels[j.track],
      industry: j.industry ?? "",
      jobType: j.jobType ?? "",
      location: j.location ?? "",
      salary: j.monthlySalary,
    })),
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
    })),
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

  const jobs = { 技人国: 0, 特定技能: 0, 技能実習: 0 } satisfies Record<JobTrackLabel, number>;
  for (const group of byTrack) jobs[jobTrackLabels[group.track]] = group._count._all;

  return {
    jobs,
    schools: { "大学・大学院": university, 専門学校: vocational, 日本語学校: languageSchool },
  };
}

/** 人気業種 (BHALO815), in the order staff set. */
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
