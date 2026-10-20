import "server-only";
import { db } from "@/server/db";
import { getPendingCounts, type PendingCounts } from "@/server/admin/reviews";
import { jobTrackLabels, schoolCategoryLabels } from "@/lib/format";

// BHALO800 管理画面. Not cached: staff expect live numbers.

const RECENT_LIMIT = 20; // MAX20件

// Japan has no daylight saving time, so JST is always UTC+9.
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Period starts in JST, as the spec defines them: 当日, 7日前以降, システム日付の月. */
function periodStarts(now: Date) {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const [y, m, d] = [jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()];
  // Date.UTC rolls day 0 and negative days back into the previous month.
  const jstMidnight = (month: number, day: number) => new Date(Date.UTC(y, month, day) - JST_OFFSET_MS);
  return { today: jstMidnight(m, d), week: jstMidnight(m, d - 7), month: jstMidnight(m, 1) };
}

export type MemberCounts = { individuals: number; companies: number; schools: number };

export type DashboardData = {
  counts: { today: MemberCounts; week: MemberCounts; month: MemberCounts; active: MemberCounts };
  /** 審査待ち: items members submitted that staff have not decided on yet. */
  pending: PendingCounts;
  recentMembers: { id: string; no: string; name: string; goals: string[]; job: string }[];
  recentJobs: { id: string; corporateNo: string; company: string; category: string; jobType: string }[];
};

async function countMembers(
  where: { createdAt?: { gte: Date }; isActive?: boolean },
): Promise<MemberCounts> {
  const [individuals, companies, schools] = await Promise.all([
    db.individual.count({ where }),
    db.corporation.count({ where: { ...where, kind: "company" } }),
    db.corporation.count({ where: { ...where, kind: "school" } }),
  ]);
  return { individuals, companies, schools };
}

/** 希望種別 from the member's 求職希望・留学希望 choices (BHALO019). */
function goals(i: {
  wantsEngineer: boolean;
  wantsSsw: boolean;
  wantsTitp: boolean;
  wantsUniversity: boolean;
  wantsVocational: boolean;
  wantsLanguageSchool: boolean;
}) {
  return [
    i.wantsEngineer && jobTrackLabels.engineer,
    i.wantsSsw && jobTrackLabels.ssw,
    i.wantsTitp && jobTrackLabels.titp,
    i.wantsUniversity && schoolCategoryLabels.university,
    i.wantsVocational && schoolCategoryLabels.vocational,
    i.wantsLanguageSchool && schoolCategoryLabels.language_school,
  ].filter((g) => g !== false);
}

export async function getDashboard(now = new Date()): Promise<DashboardData> {
  const starts = periodStarts(now);

  const [today, week, month, active, pending, members, jobs] = await Promise.all([
    countMembers({ createdAt: { gte: starts.today } }),
    countMembers({ createdAt: { gte: starts.week } }),
    countMembers({ createdAt: { gte: starts.month } }),
    countMembers({ isActive: true }),
    getPendingCounts(),
    db.individual.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        memberNo: true,
        fullName: true,
        wantsEngineer: true,
        wantsSsw: true,
        wantsTitp: true,
        wantsUniversity: true,
        wantsVocational: true,
        wantsLanguageSchool: true,
        jobWishes: { orderBy: { sortOrder: "asc" }, take: 1, select: { desiredJob: true } },
      },
    }),
    db.jobPosting.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        track: true,
        jobType: true,
        corporation: { select: { memberNo: true, name: true } },
      },
    }),
  ]);

  return {
    counts: { today, week, month, active },
    pending,
    recentMembers: members.map((m) => ({
      id: String(m.id),
      no: m.memberNo,
      name: m.fullName,
      goals: goals(m),
      job: m.jobWishes[0]?.desiredJob ?? "",
    })),
    recentJobs: jobs.map((j) => ({
      id: String(j.id),
      corporateNo: j.corporation.memberNo,
      company: j.corporation.name,
      category: jobTrackLabels[j.track],
      jobType: j.jobType ?? "",
    })),
  };
}
