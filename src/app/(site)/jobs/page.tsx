import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, SearchXIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Breadcrumb } from "@/components/site/breadcrumb";
import { JobCard } from "@/components/site/job-card";
import { JobFilterForm, minSalaryOptions, type SearchValues } from "@/components/site/job-search-form";
import { buttonVariants } from "@/components/ui/button";
import { jobTrackLabels } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getOptionLabels } from "@/server/admin/options";
import { JOBS_PER_PAGE, getJobFacets, searchJobs, type JobFilters, type JobTrackKey } from "@/server/listings";

// One address per list. The lists worth finding in a search engine are "all
// jobs" and one per 在留資格 (/jobs?track=ssw), page by page. Any other filter
// (業種, 勤務地, free words …) is a view of those: it points back to the plain
// list as its canonical address and asks not to be indexed, so thousands of
// filter combinations do not compete with each other.
export async function generateMetadata({ searchParams }: PageProps<"/jobs">): Promise<Metadata> {
  const { values, page } = parse(await searchParams);
  const label = values.track ? jobTrackLabels[values.track as JobTrackKey] : "";
  const filtered = Boolean(values.industry || values.employment || values.loc || values.q || values.min);

  const params = new URLSearchParams();
  if (values.track) params.set("track", values.track);
  if (page > 1 && !filtered) params.set("page", String(page));
  const query = params.toString();

  return {
    ...pageMeta({
      title: (label ? `${label}の求人` : "求人検索") + (page > 1 && !filtered ? `（${page}ページ目）` : ""),
      description: label
        ? `${label}の求人一覧。業種・勤務地・月給から検索できます。応募はバロジョブのスタッフが企業におつなぎします。`
        : "技人国・特定技能・育成就労の求人を、在留資格・業種・勤務地・月給から検索できます。応募はバロジョブのスタッフが企業におつなぎします。",
      path: query ? `/jobs?${query}` : "/jobs",
    }),
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

// 求人検索: filters on the left, results on the right. Everything is in the
// URL (?track=ssw&industry=建設&page=2), so a search can be shared.
export default function JobsPage({ searchParams }: PageProps<"/jobs">) {
  return (
    <div className="flex-1 bg-page">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:py-8">
        <Breadcrumb items={[{ label: "求人検索" }]} />
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

const text = (v: string | string[] | undefined, max = 60) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function parse(sp: Record<string, string | string[] | undefined>) {
  const track = text(sp.track);
  const min = text(sp.min);
  const values: SearchValues = {
    track: track in jobTrackLabels ? track : "",
    industry: text(sp.industry),
    employment: text(sp.employment),
    loc: text(sp.loc, 40),
    q: text(sp.q),
    min: minSalaryOptions.some((o) => o.value === min) ? min : "",
  };
  const filters: JobFilters = {
    track: (values.track || undefined) as JobTrackKey | undefined,
    industry: values.industry || undefined,
    employment: values.employment || undefined,
    location: values.loc || undefined,
    q: values.q || undefined,
    minSalary: values.min ? Number(values.min) : undefined,
  };
  const page = Math.min(Math.max(Number.parseInt(text(sp.page), 10) || 1, 1), 500);
  return { values, filters, page };
}

/** /jobs with the given conditions; empty ones are left out of the URL. */
function hrefFor(values: SearchValues, page = 1) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

async function Results({ searchParams }: { searchParams: PageProps<"/jobs">["searchParams"] }) {
  const { values, filters, page } = parse(await searchParams);
  const [{ total, jobs }, facets, industries] = await Promise.all([
    searchJobs(filters, page),
    getJobFacets(),
    getOptionLabels("industry"),
  ]);

  const chips: { key: keyof SearchValues; label: string }[] = [];
  if (values.track) chips.push({ key: "track", label: jobTrackLabels[values.track as JobTrackKey] });
  if (values.industry) chips.push({ key: "industry", label: values.industry });
  if (values.employment) chips.push({ key: "employment", label: values.employment });
  if (values.loc) chips.push({ key: "loc", label: `勤務地：${values.loc}` });
  if (values.min) chips.push({ key: "min", label: `月給 ${minSalaryOptions.find((o) => o.value === values.min)?.label}` });
  if (values.q) chips.push({ key: "q", label: `「${values.q}」` });

  const pages = Math.max(1, Math.ceil(total / JOBS_PER_PAGE));
  const from = total === 0 ? 0 : (page - 1) * JOBS_PER_PAGE + 1;
  const to = Math.min(page * JOBS_PER_PAGE, total);
  const form = (
    <JobFilterForm industries={industries} employmentTypes={facets.employment.map((e) => e.label)} values={values} />
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-24">
        {/* Phones: the conditions fold away so the results come first. */}
        <details className="group rounded-xl border bg-card shadow-xs lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden />
              検索条件を変更する
            </span>
            <ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          <div className="border-t p-4">{form}</div>
        </details>
        <div className="hidden rounded-xl border bg-card shadow-xs lg:block">
          <h2 className="flex items-center gap-2 border-b px-4 py-3 text-sm font-bold">
            <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden />
            検索条件
          </h2>
          <div className="p-4">{form}</div>
        </div>
      </aside>

      <section aria-labelledby="results-title" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <h1 id="results-title" className="text-2xl font-bold">
            求人情報の検索結果
          </h1>
          {chips.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2" aria-label="現在の検索条件">
              {chips.map((c) => (
                <li key={c.key}>
                  <Link
                    href={hrefFor({ ...values, [c.key]: "" })}
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 pr-2 pl-3 text-xs font-medium text-primary hover:bg-primary/10"
                    aria-label={`${c.label} を外す`}
                  >
                    {c.label}
                    <XIcon className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/jobs" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                  条件をすべてクリア
                </Link>
              </li>
            </ul>
          )}
          <p className="text-sm text-muted-foreground" role="status">
            該当求人 <span className="text-xl font-bold tabular-nums text-brand-red">{total.toLocaleString("ja-JP")}</span> 件
            {total > 0 && (
              <span className="ml-2">
                （{from}〜{to}件を表示）
              </span>
            )}
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center">
            <SearchXIcon className="size-10 text-muted-foreground" aria-hidden />
            <p className="font-semibold">条件に合う求人が見つかりませんでした</p>
            <p className="text-sm text-muted-foreground">条件を減らすか、キーワードを変えてお試しください。</p>
            <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
              すべての求人を見る
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="ページ" className="flex items-center justify-center gap-2 pt-2">
            <PageLink href={hrefFor(values, page - 1)} disabled={page <= 1} label="前のページ">
              <ChevronLeftIcon />
              前へ
            </PageLink>
            <span className="px-2 text-sm tabular-nums text-muted-foreground">
              {page} / {pages}
            </span>
            <PageLink href={hrefFor(values, page + 1)} disabled={page >= pages} label="次のページ">
              次へ
              <ChevronRightIcon />
            </PageLink>
          </nav>
        )}
      </section>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = buttonVariants({ variant: "outline", size: "lg" });
  if (disabled) {
    return (
      <span className={cn(className, "pointer-events-none opacity-40")} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]" aria-busy="true">
      <div className="hidden h-[34rem] animate-pulse rounded-xl bg-muted lg:block" />
      <div className="flex flex-col gap-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
