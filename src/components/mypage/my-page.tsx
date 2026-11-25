"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardListIcon, FileTextIcon, SearchIcon, UserPenIcon, VideoIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flash } from "@/components/admin/flash";
import { ApplicationsList, type ApplicationView } from "@/components/mypage/applications-list";
import { ApplyButton } from "@/components/mypage/apply-button";
import { ProfileStatusCard, type ProfileStatus } from "@/components/mypage/profile-status-card";
import { ResumeUploadCard, type ResumeFile } from "@/components/mypage/resume-upload-card";
import { JobCard } from "@/components/site/job-card";
import { OptionSelect } from "@/components/wizard/field-input";
import { cn } from "@/lib/utils";
import type { Job, PopularIndustry } from "@/server/listings";

// 個人マイページ. The server loads the candidate's status and every listed
// job; filtering runs in the browser. Applying is one job at a time.

const PAGE_SIZE = 30; // 1画面 MAX30件

/** "180,000〜200,000円" → [180000, 200000]. Open ends become 0 / Infinity. */
function salaryRange(label: string): [number, number] {
  const [min, max] = label.split("〜").map((part) => Number(part.replace(/[^\d]/g, "")) || 0);
  return [min, max || Infinity];
}

export type MyPageProps = {
  name: string;
  /** ?saved= from the URL (submitted / applied …). */
  saved?: string;
  status: ProfileStatus;
  resume: ResumeFile | null;
  applications: ApplicationView[];
  appliedJobIds: string[];
  jobs: Job[];
  popularIndustries: PopularIndustry[];
};

export function MyPage({ name, saved, status, resume, applications, appliedJobIds, jobs, popularIndustries }: MyPageProps) {
  return (
    <div className="flex-1 bg-page">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-8">
        <header className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="h-1.5 bg-gradient-to-r from-brand-orange to-brand-red" aria-hidden />
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex items-center gap-4">
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-red text-xl font-bold text-white"
                aria-hidden
              >
                {name.trim().charAt(0).toUpperCase() || "B"}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wider text-primary">マイページ / My Page</p>
                <h1 className="truncate text-xl font-bold md:text-2xl">こんにちは、{name}さん</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/profile/basic" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}>
                <UserPenIcon />
                プロフィール変更・確認
              </Link>
              <Link
                href="/jobs"
                className="flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red px-4 text-sm font-bold text-white shadow-sm transition-[filter] hover:brightness-110"
              >
                <SearchIcon className="size-4" aria-hidden />
                求人を探す
              </Link>
            </div>
          </div>
        </header>

        <Flash saved={saved} />

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Panel
              id="applications"
              icon={ClipboardListIcon}
              title="応募状況"
              en="Your applications"
              count={applications.length}
            >
              <ApplicationsList rows={applications} />
            </Panel>

            <Panel id="job-search" icon={SearchIcon} title="求人検索" en="Job search">
              <div className="flex flex-col gap-4 p-4 md:p-5">
                {popularIndustries.length > 0 && (
                  <p className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-muted-foreground">人気の業種</span>
                    {popularIndustries.map((i) => (
                      <span key={i.ja} className="inline-flex h-6 items-center rounded-full bg-secondary px-2.5 text-secondary-foreground">
                        {i.ja}
                      </span>
                    ))}
                  </p>
                )}
                <JobSearch jobs={jobs} appliedJobIds={appliedJobIds} />
              </div>
            </Panel>
          </div>

          <aside className="flex flex-col gap-6">
            <ProfileStatusCard status={status} />
            <ResumeUploadCard file={resume} />
            <div className="rounded-xl border bg-card p-5 shadow-xs">
              <p className="text-sm font-bold">準備中の機能</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <FileTextIcon className="size-4" aria-hidden />
                  履歴書作成（PDF出力）
                </li>
                <li className="flex items-center gap-2">
                  <VideoIcon className="size-4" aria-hidden />
                  アピール動画登録
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Coming soon</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Panel({
  id,
  icon: Icon,
  title,
  en,
  count,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  en: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <h2 id={id} className="flex items-center gap-2.5 border-b px-5 py-3.5 text-base font-bold">
        <Icon className="size-4.5 text-primary" aria-hidden />
        {title}
        <span className="text-xs font-normal text-muted-foreground">{en}</span>
        {count !== undefined && count > 0 && (
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-primary">{count}件</span>
        )}
      </h2>
      {children}
    </section>
  );
}

export function MyPageSkeleton() {
  return (
    <div className="flex-1 bg-page" aria-busy="true">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-8">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-6">
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-96 animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="flex flex-col gap-6">
            <div className="h-52 animate-pulse rounded-xl bg-muted" />
            <div className="h-52 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function JobSearch({ jobs, appliedJobIds }: { jobs: Job[]; appliedJobIds: string[] }) {
  const [category, setCategory] = useState("");
  const [industry, setIndustry] = useState("");
  const [jobType, setJobType] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");

  // Exact match for category / industry, partial match for job type and location,
  // salary inside the chosen range. Empty filters match everything; a job
  // without a salary only matches when no salary range is chosen.
  const [min, max] = salary ? salaryRange(salary) : [0, Infinity];
  const results = jobs.filter(
    (j) =>
      (!category || j.category === category) &&
      (!industry || j.industry === industry) &&
      (!jobType || j.jobType.includes(jobType) || j.workName.includes(jobType)) &&
      (!location || j.location.includes(location)) &&
      (!salary || (j.salary !== null && j.salary >= min && j.salary <= max)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-xl border bg-muted/40 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <Filter label="種別 (Classification)">
          <OptionSelect optionKey="jobCategory" value={category} onChange={setCategory} placeholder="すべて" />
        </Filter>
        <Filter label="業種 (Industry)">
          <OptionSelect optionKey="industry" value={industry} onChange={setIndustry} placeholder="すべて" />
        </Filter>
        <Filter label="職種 (Job type)">
          <Input value={jobType} onChange={(e) => setJobType(e.target.value)} placeholder="例：介護" className="bg-background" />
        </Filter>
        <Filter label="勤務地 (Location)">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例：横浜" className="bg-background" />
        </Filter>
        <Filter label="給与 (Salary)">
          <OptionSelect optionKey="salary" value={salary} onChange={setSalary} placeholder="すべて" />
        </Filter>
      </div>

      {results.length === 0 ? (
        <p className="rounded-xl border p-8 text-center text-muted-foreground">対象データがありません。</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground" role="status">
            該当求人 <span className="text-lg font-bold tabular-nums text-brand-red">{results.length}</span> 件
            {results.length > PAGE_SIZE && <span className="ml-2">（新着{PAGE_SIZE}件を表示）</span>}
          </p>
          <ul className="flex flex-col gap-4">
            {results.slice(0, PAGE_SIZE).map((j) => (
              <li key={j.id}>
                <JobCard job={j} action={<ApplyButton jobId={j.id} applied={appliedJobIds.includes(j.id)} />} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Wrapping the control in the label gives it an accessible name.
function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Label className="flex-col items-stretch gap-2 text-xs">
      {label}
      {children}
    </Label>
  );
}
