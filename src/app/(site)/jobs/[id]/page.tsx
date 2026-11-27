import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BanknoteIcon,
  Building2Icon,
  ClockIcon,
  InfoIcon,
  LogInIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from "lucide-react";
import { ApplyButton } from "@/components/mypage/apply-button";
import { Breadcrumb } from "@/components/site/breadcrumb";
import { NewBadge, Tag, TrackBadge, featureTags, jobTitle, salaryText } from "@/components/site/job-card";
import { BreadcrumbJsonLd, JobPostingJsonLd } from "@/components/site/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getMember } from "@/server/auth/member";
import { getPublicJob, type JobDetail } from "@/server/listings";
import { appliedJobIds } from "@/server/member/candidate";

type Props = PageProps<"/jobs/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getPublicJob((await params).id);
  if (!job) return { title: "求人が見つかりません", robots: { index: false } };
  return pageMeta({
    title: `${jobTitle(job)}｜${job.company}`,
    description: [job.category, job.industry, job.location, salaryText(job.salary), job.description].filter(Boolean).join("／").slice(0, 160),
    path: `/jobs/${job.id}`,
  });
}

// One job. Anyone can read it; applying needs a candidate login. The company
// block shows the name and 許可・登録番号 only: introductions go through staff.
export default function JobPage({ params }: Props) {
  return (
    <div className="flex-1 bg-page">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:py-8">
        <Suspense fallback={<JobSkeleton />}>
          <JobView params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function JobView({ params }: { params: Props["params"] }) {
  const job = await getPublicJob((await params).id);
  if (!job) notFound();

  const title = jobTitle(job);
  const tags = featureTags(job.features);
  const rows: [string, React.ReactNode][] = [
    ["職種", [job.jobType, job.workName].filter(Boolean).join("／")],
    ["仕事内容", job.description],
    ["在留資格", job.category],
    ["業種", job.industry],
    ["雇用形態", job.employmentType],
    ["勤務地", job.location],
    ["勤務時間", [job.hours, job.breakTime && `休憩 ${job.breakTime}`].filter(Boolean).join("　")],
    ["時間外労働", job.overtime],
    ["勤務日数", job.weeklyWorkDays],
    ["休日", job.holidays],
    ["給与", job.salary === null ? "" : salaryText(job.salary)],
    ["通勤手当", job.commute],
    ["加入保険", job.insurance.join("・")],
    ["日本語レベル", job.japaneseLevel],
    ["特徴", job.features],
  ];

  return (
    <>
      <Breadcrumb items={[{ label: "求人検索", href: "/jobs" }, { label: title }]} />
      {/* The same facts for search engines (Google for Jobs reads JobPosting). */}
      <JobPostingJsonLd job={job} />
      <BreadcrumbJsonLd
        items={[
          { label: "求人検索", path: "/jobs" },
          { label: title, path: `/jobs/${job.id}` },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <header className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="h-1.5 bg-gradient-to-r from-brand-orange to-brand-red" aria-hidden />
            <div className="flex flex-col gap-4 p-5 md:p-7">
              <div className="flex flex-wrap items-center gap-1.5">
                {job.isNew && <NewBadge />}
                <TrackBadge track={job.track} label={job.category} />
                {job.employmentType && <Tag>{job.employmentType}</Tag>}
                {job.industry && <Tag>{job.industry}</Tag>}
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl leading-snug font-bold md:text-3xl">
                  {title}
                  {job.workName && job.jobType && <span className="text-xl font-medium text-foreground/70">（{job.workName}）</span>}
                </h1>
                <p className="flex items-center gap-2 text-base">
                  <Building2Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  {job.company}
                </p>
              </div>
              <dl className="grid gap-3 rounded-lg bg-muted/60 p-4 sm:grid-cols-3">
                <Summary icon={BanknoteIcon} label="給与" value={salaryText(job.salary)} strong />
                <Summary icon={MapPinIcon} label="勤務地" value={job.location || "—"} />
                <Summary icon={ClockIcon} label="勤務時間" value={job.hours || "—"} />
              </dl>
              {tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <li key={t}>
                      <Tag className="border-transparent bg-secondary text-secondary-foreground">{t}</Tag>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </header>

          <Section title="募集要項">
            <dl className="divide-y text-sm">
              {rows
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <dt className="font-semibold text-foreground/70">{label}</dt>
                    <dd className="whitespace-pre-line">{value}</dd>
                  </div>
                ))}
            </dl>
          </Section>

          <Section title="企業情報">
            <dl className="divide-y text-sm">
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="font-semibold text-foreground/70">企業名</dt>
                <dd>{job.company}</dd>
              </div>
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="font-semibold text-foreground/70">許可・登録番号</dt>
                <dd className="flex items-center gap-1.5">
                  {job.licenseNo ? (
                    <>
                      <ShieldCheckIcon className="size-4 text-emerald-700" aria-hidden />
                      {job.licenseNo}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            <p className="flex items-start gap-2 border-t bg-muted/50 px-5 py-3.5 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              企業の連絡先は公開していません。応募後、バロジョブのスタッフが内容を確認し、企業とのやり取りをおつなぎします。
            </p>
          </Section>

          <Section title="応募の流れ">
            <ol className="grid gap-4 p-5 sm:grid-cols-3">
              {[
                ["応募する", "このページの「応募する」ボタンを押します。追加の入力はありません。"],
                ["スタッフが確認", "バロジョブのスタッフが、あなたのプロフィールと応募内容を確認します。"],
                ["企業へご紹介", "確認後、企業にご紹介します。面接などのご連絡はスタッフからお届けします。"],
              ].map(([head, body], i) => (
                <li key={head} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold">{head}</p>
                    <p className="mt-1 text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <aside id="apply" className="scroll-mt-28 lg:sticky lg:top-24">
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs">
            <div>
              <p className="text-xs text-muted-foreground">{job.company}</p>
              <p className="mt-0.5 font-bold">{title}</p>
              <p className="mt-2 text-lg font-bold text-brand-red">{salaryText(job.salary)}</p>
            </div>
            <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-muted" aria-busy="true" />}>
              <ApplyPanel job={job} />
            </Suspense>
            <p className="text-xs text-muted-foreground">
              求人番号 {job.corporateNo}-{String(job.jobNo).padStart(2, "0")}　掲載日 {job.postedOn}
            </p>
          </div>
        </aside>
      </div>

      {/* Phones: the apply card is below the long description, so keep a way to it in reach. */}
      <div className="sticky bottom-0 z-30 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <a
          href="#apply"
          className="flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-brand-orange to-brand-red text-sm font-bold text-white"
        >
          応募に進む
        </a>
      </div>
    </>
  );
}

// Depends on who is signed in, so it streams in behind the rest of the page.
async function ApplyPanel({ job }: { job: JobDetail }) {
  const member = await getMember();
  const next = encodeURIComponent(`/jobs/${job.id}`);

  if (!member) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href={`/login?next=${next}`}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red text-base font-bold text-white shadow-sm transition-[filter] hover:brightness-110"
        >
          <LogInIcon className="size-5" aria-hidden />
          ログインして応募する
        </Link>
        <Link href="/register/individual" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}>
          <UserPlusIcon />
          はじめての方は無料会員登録
        </Link>
      </div>
    );
  }

  if (member.kind !== "individual" || !member.individualId) {
    return (
      <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        企業アカウントでログイン中です。応募は求職者（個人会員）のアカウントで行えます。
      </p>
    );
  }

  const applied = (await appliedJobIds(BigInt(member.individualId))).includes(job.id);
  return <ApplyButton jobId={job.id} applied={applied} size="lg" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <h2 className="flex items-center gap-2.5 border-b px-5 py-3.5 text-base font-bold">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-brand-orange to-brand-red" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  strong = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={cn("text-sm", strong && "font-bold")}>{value}</dd>
      </div>
    </div>
  );
}

function JobSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
