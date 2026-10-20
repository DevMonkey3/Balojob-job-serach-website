import "server-only";
import { db } from "@/server/db";
import { contains } from "@/server/admin/jobs";

// クイック検索 in the console header. The spec left the scope open
// ("検索場所等は別途検討"); this searches members, corporations and job postings.

const LIMIT = 20;

export async function quickSearch(q: string) {
  const term = q.trim();
  if (!term) return { members: [], corporations: [], jobs: [] };
  const match = contains(term);

  const [members, corporations, jobs] = await Promise.all([
    db.individual.findMany({
      where: { OR: [{ memberNo: match }, { fullName: match }, { nameKana: match }, { user: { email: match } }] },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: { id: true, memberNo: true, fullName: true, nationality: true, isActive: true, user: { select: { email: true } } },
    }),
    db.corporation.findMany({
      where: { OR: [{ memberNo: match }, { name: match }, { nameKana: match }, { user: { email: match } }] },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: { id: true, memberNo: true, name: true, kind: true, prefecture: true, isActive: true },
    }),
    db.jobPosting.findMany({
      where: { OR: [{ jobType: match }, { industry: match }, { workName: match }, { corporation: { name: match } }] },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        jobNo: true,
        track: true,
        industry: true,
        jobType: true,
        isActive: true,
        corporation: { select: { memberNo: true, name: true } },
      },
    }),
  ]);

  return {
    members: members.map((m) => ({ ...m, id: String(m.id), email: m.user.email })),
    corporations: corporations.map((c) => ({ ...c, id: String(c.id) })),
    jobs: jobs.map((j) => ({ ...j, id: String(j.id) })),
  };
}
