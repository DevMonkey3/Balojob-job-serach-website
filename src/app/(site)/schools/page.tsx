import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, GraduationCapIcon, InfoIcon, MapPinIcon, UsersIcon, WalletIcon } from "lucide-react";
import { Breadcrumb } from "@/components/site/breadcrumb";
import { Tag } from "@/components/site/job-card";
import { schoolCategoryLabels, yen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getListings, type Recruitment } from "@/server/listings";

export const metadata: Metadata = {
  title: "学校を探す",
  description: "留学生を募集している日本の大学・大学院、専門学校、日本語学校の学部・学科・コースの一覧です。",
};

type CategoryKey = keyof typeof schoolCategoryLabels;

const tabs: { key: CategoryKey | ""; label: string }[] = [
  { key: "", label: "すべて" },
  { key: "university", label: schoolCategoryLabels.university },
  { key: "vocational", label: schoolCategoryLabels.vocational },
  { key: "language_school", label: schoolCategoryLabels.language_school },
];

// 学校を探す: the 生徒募集 that staff registered, grouped by school. Read-only:
// candidates tell us where they want to study in their profile and staff follow up.
export default function SchoolsPage({ searchParams }: PageProps<"/schools">) {
  return (
    <div className="flex-1 bg-page">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:py-8">
        <Breadcrumb items={[{ label: "学校を探す" }]} />
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <GraduationCapIcon className="size-6 text-primary" aria-hidden />
            学校を探す
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Study in Japan: universities, vocational schools and Japanese language schools.</p>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy="true" />}>
          <Schools searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Schools({ searchParams }: { searchParams: PageProps<"/schools">["searchParams"] }) {
  const raw = (await searchParams).category;
  const category = typeof raw === "string" && raw in schoolCategoryLabels ? (raw as CategoryKey) : "";
  const { recruitments } = await getListings();

  const wanted = category ? schoolCategoryLabels[category] : null;
  const shown = wanted ? recruitments.filter((r) => r.categories.includes(wanted)) : recruitments;

  // One card per school, its courses inside.
  const schools = new Map<string, Recruitment[]>();
  for (const r of shown) schools.set(r.corporateNo, [...(schools.get(r.corporateNo) ?? []), r]);

  return (
    <>
      <nav aria-label="学校の種別" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/schools?category=${t.key}` : "/schools"}
            aria-current={category === t.key ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center rounded-full border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary",
              category === t.key && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted-foreground" role="status">
        <span className="text-xl font-bold tabular-nums text-brand-red">{schools.size}</span> 校・
        <span className="font-bold tabular-nums text-foreground">{shown.length}</span> コース
      </p>

      {schools.size === 0 ? (
        <p className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">現在、募集中の学校はありません。</p>
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {[...schools.values()].map((courses) => {
            const school = courses[0];
            return (
              <li key={school.corporateNo} className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
                <div className="flex items-center gap-3 border-b px-5 py-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <GraduationCapIcon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{school.school}</h2>
                    <p className="flex flex-wrap gap-1.5 pt-1">
                      {school.categories.map((c) => (
                        <Tag key={c} className="border-transparent bg-secondary text-secondary-foreground">
                          {c}
                        </Tag>
                      ))}
                    </p>
                  </div>
                </div>
                <ul className="divide-y">
                  {courses.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 px-5 py-4 text-sm">
                      <p className="font-semibold">{[r.faculty, r.department].filter(Boolean).join("　") || "コース"}</p>
                      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
                        {r.location && (
                          <div className="flex items-center gap-1.5">
                            <dt>
                              <MapPinIcon className="size-4" aria-hidden />
                              <span className="sr-only">所在地</span>
                            </dt>
                            <dd>{r.location}</dd>
                          </div>
                        )}
                        {r.capacity !== null && (
                          <div className="flex items-center gap-1.5">
                            <dt>
                              <UsersIcon className="size-4" aria-hidden />
                              <span className="sr-only">定員</span>
                            </dt>
                            <dd>定員 {r.capacity.toLocaleString("ja-JP")}名</dd>
                          </div>
                        )}
                        {r.tuition !== null && (
                          <div className="flex items-center gap-1.5">
                            <dt>
                              <WalletIcon className="size-4" aria-hidden />
                              <span className="sr-only">学費</span>
                            </dt>
                            <dd className="font-semibold text-foreground">年間 {yen(r.tuition)}</dd>
                          </div>
                        )}
                      </dl>
                      {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            留学をご希望の方は、会員登録のうえプロフィールの「留学希望」をご入力ください。バロジョブのスタッフがご案内します。
            <span className="block text-xs text-muted-foreground">
              Register and fill in your study wishes in your profile. Our staff will contact you.
            </span>
          </span>
        </p>
        <Link
          href="/register/individual"
          className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red px-6 text-sm font-bold text-white shadow-sm transition-[filter] hover:brightness-110"
        >
          無料会員登録
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
    </>
  );
}
