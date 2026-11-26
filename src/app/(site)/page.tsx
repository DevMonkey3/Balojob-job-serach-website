import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRightIcon,
  BedDoubleIcon,
  BriefcaseIcon,
  Building2Icon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CodeXmlIcon,
  FactoryIcon,
  FishIcon,
  GraduationCapIcon,
  HandshakeIcon,
  HardHatIcon,
  HeartHandshakeIcon,
  LogInIcon,
  MapPinIcon,
  SearchIcon,
  SproutIcon,
  UserPenIcon,
  UserIcon,
  UtensilsIcon,
  WrenchIcon,
} from "lucide-react";
import { JobCard } from "@/components/site/job-card";
import { JobSearchBar } from "@/components/site/job-search-form";
import { RegisterChoice } from "@/components/site/register-choice";
import { SectionTitle } from "@/components/site/section-title";
import { buttonVariants } from "@/components/ui/button";
import { jobTrackLabels, schoolCategoryLabels } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getOptionLabels } from "@/server/admin/options";
import { getMember, memberHome } from "@/server/auth/member";
import { getJobFacets, getListingCounts, getListings, getPopularIndustries } from "@/server/listings";

const tracks = [
  { key: "engineer", en: "Engineer / Specialist", body: "エンジニア、通訳、事務など専門職での就職。", tone: "from-sky-500 to-sky-600" },
  { key: "ssw", en: "Specified Skilled Worker", body: "介護・建設・外食などの分野で、即戦力として働く。", tone: "from-brand-orange to-brand-red" },
  { key: "titp", en: "Employment for Skill Development (ESD)", body: "日本の現場で働きながら、技能と日本語を身につける制度。", tone: "from-emerald-500 to-emerald-600" },
] as const;

const schoolTypes = [
  { key: "university", en: "University / Graduate school" },
  { key: "vocational", en: "Vocational school" },
  { key: "language_school", en: "Japanese language school" },
] as const;

const howItWorks = [
  { icon: UserPenIcon, title: "無料会員登録", body: "メールアドレスで登録し、プロフィール（履歴書）を作成します。" },
  { icon: SearchIcon, title: "求人・学校を探す", body: "在留資格・業種・勤務地から、希望に合う求人や学校を探します。" },
  { icon: HandshakeIcon, title: "応募する", body: "気になる求人に応募すると、スタッフが内容を確認して企業におつなぎします。" },
];

const industryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  介護: HeartHandshakeIcon,
  建設: HardHatIcon,
  農業: SproutIcon,
  IT: CodeXmlIcon,
  自動車整備: WrenchIcon,
  外食: UtensilsIcon,
  外食業: UtensilsIcon,
  宿泊: BedDoubleIcon,
  製造: FactoryIcon,
  水産加工: FishIcon,
  漁業: FishIcon,
};

// Database reads happen per request (after connection()), so `next build`
// doesn't need the database. The numbers themselves come from a shared cache.
export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-brand-orange/15 via-background to-brand-red/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--brand-orange),transparent_82%)_1px,transparent_0)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-10 pb-8 md:pt-14 md:pb-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-5">
              <p className="w-fit rounded-full border border-primary/25 bg-background/80 px-3 py-1 text-xs font-semibold text-primary">
                外国人材 × 日本の企業・学校
              </p>
              <h1 className="text-3xl leading-tight font-extrabold tracking-tight md:text-5xl md:leading-[1.15]">
                日本で働く。日本で学ぶ。
                <br />
                <span className="bg-gradient-to-r from-brand-orange to-brand-red bg-clip-text text-transparent">
                  その一歩を、バロジョブで。
                </span>
              </h1>
              <p className="max-w-xl text-base text-foreground/80 md:text-lg">
                技人国・特定技能・育成就労の求人と、大学・専門学校・日本語学校の情報を掲載。応募から企業へのご紹介まで、スタッフがサポートします。
              </p>
              <p className="max-w-xl text-sm text-muted-foreground">
                Find jobs and schools in Japan. Our staff support you from application to introduction.
              </p>
            </div>
            <Suspense fallback={<RegisterChoice />}>
              <HeroCard />
            </Suspense>
          </div>

          <div className="flex flex-col gap-3">
            <Suspense fallback={<p className="h-6 w-64 animate-pulse rounded bg-muted" />}>
              <JobTotals />
            </Suspense>
            <Suspense fallback={<JobSearchBar industries={[]} />}>
              <SearchBar />
            </Suspense>
            <Suspense fallback={<div className="h-7" />}>
              <PopularIndustries />
            </Suspense>
          </div>
        </div>
      </section>

      <div className="bg-page">
        <section aria-labelledby="new-jobs" className="mx-auto w-full max-w-6xl px-4 pt-12">
          <SectionTitle id="new-jobs" ja="新着求人" en="New jobs" icon={BriefcaseIcon} href="/jobs" linkLabel="すべての求人を見る" />
          <Suspense fallback={<CardGridSkeleton />}>
            <LatestJobs />
          </Suspense>
        </section>

        <section aria-labelledby="by-visa" className="mx-auto w-full max-w-6xl px-4 pt-14">
          <SectionTitle id="by-visa" ja="在留資格から探す" en="Find jobs by visa type" icon={SearchIcon} />
          <Suspense fallback={<TrackCards />}>
            <TrackCardsWithCounts />
          </Suspense>
        </section>

        <section aria-labelledby="by-industry" className="mx-auto w-full max-w-6xl px-4 pt-14">
          <SectionTitle id="by-industry" ja="業種・勤務地から探す" en="Find jobs by industry or location" icon={MapPinIcon} />
          <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-muted" />}>
            <Facets />
          </Suspense>
        </section>

        <section id="schools" aria-labelledby="study" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pt-14">
          <SectionTitle id="study" ja="日本に留学する" en="Study in Japan" icon={GraduationCapIcon} href="/schools" linkLabel="学校一覧を見る" />
          <Suspense fallback={<SchoolCards />}>
            <SchoolCardsWithCounts />
          </Suspense>
        </section>

        <section id="flow" aria-labelledby="flow-title" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-14">
          <SectionTitle id="flow-title" ja="ご利用の流れ" en="How it works" icon={CheckCircle2Icon} />
          <ol className="grid gap-4 md:grid-cols-3">
            {howItWorks.map((step, i) => (
              <li key={step.title} className="relative flex gap-4 rounded-xl border bg-card p-5 shadow-xs">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-red text-white shadow-sm">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-bold tracking-wider text-primary">STEP {i + 1}</p>
                  <p className="mt-0.5 font-bold">{step.title}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/register/individual"
              className="flex h-12 items-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red px-8 text-base font-bold text-white shadow-sm transition-[filter] hover:brightness-110"
            >
              無料で会員登録する
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>

      <section id="companies" className="scroll-mt-20 bg-gradient-to-r from-primary to-brand-red text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold opacity-90">企業・監理団体・登録支援機関の方へ</p>
            <h2 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
              <Building2Icon aria-hidden />
              求人を無料で掲載できます
            </h2>
            <ul className="grid gap-2 text-sm sm:grid-cols-3">
              {["求人の掲載は無料", "スタッフが応募者を確認してご紹介", "応募者の履歴書をオンラインで確認"].map((point) => (
                <li key={point} className="flex items-center gap-2 rounded-lg bg-white/12 px-3 py-2.5">
                  <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
            <p className="text-xs opacity-80">大学・専門学校・日本語学校の会員登録は準備中です。</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/register/corporate"
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-7 text-base font-bold text-primary shadow-sm transition-colors hover:bg-white/90"
            >
              法人会員登録（無料）
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
            <Link
              href="/login?as=employer"
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/60 px-7 text-base font-semibold transition-colors hover:bg-white/10"
            >
              <LogInIcon className="size-4" aria-hidden />
              企業ログイン
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero pieces
// ---------------------------------------------------------------------------

async function HeroCard() {
  const member = await getMember();
  if (!member) return <RegisterChoice />;
  const individual = member.kind === "individual";
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-lg shadow-brand-orange/10">
      <p className="text-sm text-muted-foreground">ログイン中</p>
      <p className="flex items-center gap-2 text-lg font-bold">
        {individual ? <UserIcon className="size-5 text-primary" aria-hidden /> : <Building2Icon className="size-5 text-primary" aria-hidden />}
        <span className="truncate">{member.name} さん</span>
      </p>
      <Link
        href={memberHome(member.kind)}
        className="flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red text-base font-bold text-white shadow-sm transition-[filter] hover:brightness-110"
      >
        {individual ? "マイページへ" : "企業ページへ"}
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
      {individual && (
        <Link href="/jobs" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}>
          <SearchIcon />
          求人を探す
        </Link>
      )}
    </div>
  );
}

async function JobTotals() {
  await connection();
  const facets = await getJobFacets();
  return (
    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      <span>
        公開求人{" "}
        <span className="text-2xl font-extrabold tabular-nums text-brand-red">{facets.total.toLocaleString("ja-JP")}</span> 件
      </span>
      {facets.newCount > 0 && (
        <span className="text-muted-foreground">
          新着 <span className="font-bold tabular-nums text-foreground">{facets.newCount.toLocaleString("ja-JP")}</span> 件
        </span>
      )}
      {facets.updatedOn && <span className="text-muted-foreground">{facets.updatedOn} 更新</span>}
    </p>
  );
}

async function SearchBar() {
  await connection();
  return <JobSearchBar industries={await getOptionLabels("industry")} />;
}

async function PopularIndustries() {
  await connection();
  const industries = await getPopularIndustries();
  if (industries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs font-semibold text-muted-foreground">人気の業種</span>
      {industries.map((i) => (
        <Link
          key={i.ja}
          href={`/jobs?q=${encodeURIComponent(i.ja)}`}
          prefetch={false}
          title={i.en || undefined}
          className="inline-flex h-7 items-center rounded-full border bg-background/80 px-3 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          {i.ja}
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

async function LatestJobs() {
  await connection();
  const { jobs } = await getListings();
  if (jobs.length === 0) {
    return <p className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">現在、掲載中の求人はありません。</p>;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.slice(0, 6).map((job) => (
        <li key={job.id}>
          <JobCard job={job} compact />
        </li>
      ))}
    </ul>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

async function TrackCardsWithCounts() {
  await connection();
  const { jobs } = await getListingCounts();
  return <TrackCards counts={jobs} />;
}

/** Without `counts` (while loading), the numbers show as "…". */
function TrackCards({ counts }: { counts?: Record<string, number> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tracks.map((t) => {
        const label = jobTrackLabels[t.key];
        return (
          <Link
            key={t.key}
            href={`/jobs?track=${t.key}`}
            className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className={cn("h-1.5 bg-gradient-to-r", t.tone)} aria-hidden />
            <span className="flex flex-1 flex-col gap-3 p-5">
              <span>
                <span className="block text-xl font-bold">{label}</span>
                <span className="block text-xs text-muted-foreground">{t.en}</span>
              </span>
              <span className="text-sm text-foreground/80">{t.body}</span>
              <span className="mt-auto flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  掲載中 <span className="text-lg font-bold tabular-nums text-foreground">{counts?.[label] ?? "…"}</span> 件
                </span>
                <span className="flex items-center gap-0.5 font-semibold text-primary">
                  求人を見る
                  <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

async function Facets() {
  await connection();
  const facets = await getJobFacets();
  if (facets.total === 0) {
    return <p className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">現在、掲載中の求人はありません。</p>;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-xl border bg-card shadow-xs">
        <h3 className="border-b px-5 py-3 text-sm font-bold">業種から探す</h3>
        <ul className="grid gap-px overflow-hidden rounded-b-xl bg-border sm:grid-cols-2">
          {facets.industries.slice(0, 8).map((f) => {
            const Icon = industryIcons[f.label] ?? BriefcaseIcon;
            return (
              <li key={f.label} className="bg-card">
                <Link
                  href={`/jobs?industry=${encodeURIComponent(f.label)}`}
                  prefetch={false}
                  className="group flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-primary/5"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="font-semibold group-hover:text-primary">{f.label}</span>
                  <span className="ml-auto tabular-nums text-muted-foreground">{f.count}件</span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-xl border bg-card shadow-xs">
        <h3 className="border-b px-5 py-3 text-sm font-bold">勤務地から探す</h3>
        <ul className="flex flex-wrap gap-2 p-5">
          {facets.prefectures.slice(0, 16).map((f) => (
            <li key={f.label}>
              <Link
                href={`/jobs?loc=${encodeURIComponent(f.label)}`}
                prefetch={false}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <MapPinIcon className="size-3.5 text-primary" aria-hidden />
                {f.label}
                <span className="tabular-nums text-muted-foreground">({f.count})</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

async function SchoolCardsWithCounts() {
  await connection();
  const { schools } = await getListingCounts();
  return <SchoolCards counts={schools} />;
}

function SchoolCards({ counts }: { counts?: Record<string, number> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {schoolTypes.map((s) => {
        const label = schoolCategoryLabels[s.key];
        return (
          <Link
            key={s.key}
            href={`/schools?category=${s.key}`}
            className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-xs outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCapIcon className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold group-hover:text-primary">{label}</span>
              <span className="block text-xs text-muted-foreground">{s.en}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                募集中の学部・学科 <span className="font-bold tabular-nums text-foreground">{counts?.[label] ?? "…"}</span> 件
              </span>
            </span>
            <ChevronRightIcon className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}
