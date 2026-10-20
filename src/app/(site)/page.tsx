import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  BriefcaseIcon,
  Building2Icon,
  GraduationCapIcon,
  HandshakeIcon,
  SearchIcon,
  UserPenIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterChoice } from "@/components/site/register-choice";
import type { JobTrackLabel, SchoolCategoryLabel } from "@/lib/format";
import { getListingCounts, getPopularIndustries } from "@/server/listings";

const tracks = [
  { ja: "技人国", en: "Engineer / Specialist", body: "エンジニア、通訳、事務など専門職での就職。" },
  { ja: "特定技能", en: "Specified Skilled Worker", body: "介護・建設・外食などの分野で、即戦力として働く。" },
  { ja: "技能実習", en: "Technical Intern Training", body: "日本の現場で技能を学びながら働く制度。" },
] as const;

const schoolTypes = [
  { ja: "大学・大学院", en: "University / Graduate school", key: "大学・大学院" },
  { ja: "専門学校", en: "Vocational school", key: "専門学校" },
  { ja: "日本語学校", en: "Japanese language school", key: "日本語学校" },
] as const;

const organisations = ["企業", "監理団体", "登録支援機関", "大学・大学院", "専門学校", "日本語学校"];

const howItWorks = [
  { icon: UserPenIcon, title: "無料会員登録", body: "ログイン情報を登録して、プロフィールを作成します。" },
  { icon: SearchIcon, title: "求人・学校を探す", body: "希望に合った求人や学校がマイページに表示されます。" },
  { icon: HandshakeIcon, title: "コンタクト申込", body: "気になる企業・学校を選んで申し込むと、担当者がおつなぎします。" },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-gradient-to-br from-brand-orange/15 via-background to-brand-red/10">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1fr_380px] md:py-24">
          <div className="flex flex-col gap-6">
            <Badge variant="secondary" className="w-fit">
              外国人材 × 日本の企業・学校
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              世界中の優秀な人材と、
              <br />
              日本の企業・学校をつなぐ。
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              バロジョブは、より速く、より簡単に世界中の優秀な人材と企業をマッチングするお手伝いをします。
            </p>
            <p className="max-w-xl text-sm text-muted-foreground">
              Bhalojob helps talented people from around the world find jobs and schools in Japan — faster and more
              easily.
            </p>
          </div>
          <RegisterChoice />
        </div>
      </section>

      <section id="jobs" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16">
        <SectionTitle ja="在留資格から求人を探す" en="Find jobs by visa type" icon={BriefcaseIcon} />
        <Suspense fallback={<TrackCards />}>
          <TrackCardsWithCounts />
        </Suspense>
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold">人気の業種 (Popular industries)</h3>
          <Suspense fallback={<div className="h-8 animate-pulse rounded-md bg-muted" />}>
            <PopularIndustries />
          </Suspense>
        </div>
      </section>

      <section id="schools" className="scroll-mt-20 border-y bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <SectionTitle ja="日本に留学する" en="Study in Japan" icon={GraduationCapIcon} />
          <Suspense fallback={<SchoolCards />}>
            <SchoolCardsWithCounts />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <SectionTitle ja="ご利用の流れ" en="How it works" />
        <ol className="grid gap-4 md:grid-cols-3">
          {howItWorks.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-xl border p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-red text-white">
                <step.icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">STEP {i + 1}</p>
                <p className="font-semibold">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="companies" className="scroll-mt-20 bg-gradient-to-r from-primary to-brand-red text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Building2Icon aria-hidden />
              企業・学校の方へ
            </h2>
            <p className="max-w-xl opacity-90">
              求人情報・生徒募集情報を無料で掲載できます。対象：{organisations.join("・")}
            </p>
          </div>
          <Link href="/register/corporate" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            法人会員登録（無料）
          </Link>
        </div>
      </section>
    </>
  );
}

// Database reads happen per request (after connection()), so `next build` doesn't
// need the database. The counts themselves come from a shared cache.

async function TrackCardsWithCounts() {
  await connection();
  const { jobs } = await getListingCounts();
  return <TrackCards counts={jobs} />;
}

async function SchoolCardsWithCounts() {
  await connection();
  const { schools } = await getListingCounts();
  return <SchoolCards counts={schools} />;
}

async function PopularIndustries() {
  await connection();
  const industries = await getPopularIndustries();
  return (
    <ul className="flex flex-wrap gap-2">
      {industries.map((i) => (
        <li key={i.ja}>
          <Badge variant="outline" className="px-3 py-1 text-sm">
            ★ {i.ja} {i.en && <span className="text-muted-foreground">({i.en})</span>}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** Without `counts` (while loading), the numbers show as "…". */
function TrackCards({ counts }: { counts?: Record<JobTrackLabel, number> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tracks.map((t) => (
        <Link key={t.ja} href="/mypage" className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
            <CardHeader>
              <CardTitle className="text-xl">{t.ja}</CardTitle>
              <CardDescription>{t.en}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p>{t.body}</p>
              <p className="flex items-center justify-between text-muted-foreground">
                <span>
                  掲載中の求人：<span className="font-semibold tabular-nums text-foreground">{counts?.[t.ja] ?? "…"}</span>件
                </span>
                <span className="text-primary">求人を見る →</span>
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function SchoolCards({ counts }: { counts?: Record<SchoolCategoryLabel, number> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {schoolTypes.map((s) => (
        <Card key={s.ja}>
          <CardHeader>
            <CardTitle className="text-xl">{s.ja}</CardTitle>
            <CardDescription>{s.en}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            募集中の学部・学科：{counts?.[s.key] ?? "…"}件
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionTitle({
  ja,
  en,
  icon: Icon,
}: {
  ja: string;
  en: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-8 flex flex-col gap-1">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        {Icon && <Icon className="size-6 text-primary" />}
        {ja}
      </h2>
      <p className="text-sm text-muted-foreground">{en}</p>
    </div>
  );
}
