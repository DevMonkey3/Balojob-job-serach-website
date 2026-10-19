"use client";

import { useState } from "react";
import Link from "next/link";
import { FileTextIcon, LogOutIcon, UserPenIcon, VideoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flash } from "@/components/admin/flash";
import { ApplicationsList, type ApplicationView } from "@/components/mypage/applications-list";
import { ApplyButton } from "@/components/mypage/apply-button";
import { ProfileStatusCard, type ProfileStatus } from "@/components/mypage/profile-status-card";
import { ResumeUploadCard, type ResumeFile } from "@/components/mypage/resume-upload-card";
import { OptionSelect } from "@/components/wizard/field-input";
import { logoutMemberAction } from "@/server/auth/member-actions";
import { yen } from "@/lib/format";
import type { Job, PopularIndustry } from "@/server/listings";

// BHALO200 個人マイページ. The server loads the candidate's status and every
// listed job; filtering runs in the browser. Applying is one job at a time.

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">BHALO200</p>
          <h1 className="text-2xl font-bold">こんにちは、{name}さん</h1>
          <p className="text-sm text-muted-foreground">My Page</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile/basic" className={buttonVariants({ variant: "outline" })}>
            <UserPenIcon />
            プロフィール変更・確認
          </Link>
          <Button variant="outline" disabled title="準備中 (Coming soon)">
            <FileTextIcon />
            履歴書作成
          </Button>
          <Button variant="outline" disabled title="準備中 (Coming soon)">
            <VideoIcon />
            アピール動画登録
          </Button>
          <form action={logoutMemberAction}>
            <Button type="submit" variant="ghost">
              <LogOutIcon />
              ログアウト
            </Button>
          </form>
        </div>
      </div>

      <Flash saved={saved} />

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileStatusCard status={status} />
        <ResumeUploadCard file={resume} />
      </div>

      <section aria-labelledby="applications" className="flex flex-col gap-3">
        <h2 id="applications" className="text-lg font-semibold">
          応募状況 <span className="text-sm font-normal text-muted-foreground">Your applications</span>
        </h2>
        <ApplicationsList rows={applications} />
      </section>

      <section aria-labelledby="popular">
        <h2 id="popular" className="mb-3 text-sm font-semibold">
          人気の業種 (Popular industries)
        </h2>
        <ul className="flex flex-wrap gap-2">
          {popularIndustries.map((i) => (
            <li key={i.ja}>
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                ★ {i.ja}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="job-search" className="flex flex-col gap-4">
        <h2 id="job-search" className="text-lg font-semibold">
          求人検索 <span className="text-sm font-normal text-muted-foreground">Job search</span>
        </h2>
        <JobSearch jobs={jobs} appliedJobIds={appliedJobIds} />
      </section>
    </div>
  );
}

export function MyPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy="true" />
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
      (!jobType || j.jobType.includes(jobType)) &&
      (!location || j.location.includes(location)) &&
      (!salary || (j.salary !== null && j.salary >= min && j.salary <= max)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Filter label="種別 (Classification)">
          <OptionSelect optionKey="jobCategory" value={category} onChange={setCategory} placeholder="すべて" />
        </Filter>
        <Filter label="業種 (Industry)">
          <OptionSelect optionKey="industry" value={industry} onChange={setIndustry} placeholder="すべて" />
        </Filter>
        <Filter label="職種 (Job type)">
          <Input value={jobType} onChange={(e) => setJobType(e.target.value)} placeholder="例：介護" />
        </Filter>
        <Filter label="勤務地 (Location)">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例：横浜" />
        </Filter>
        <Filter label="給与 (Salary)">
          <OptionSelect optionKey="salary" value={salary} onChange={setSalary} placeholder="すべて" />
        </Filter>
      </div>

      {results.length === 0 ? (
        <p className="rounded-xl border p-8 text-center text-muted-foreground">対象データがありません。</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{results.length}件</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {results.slice(0, PAGE_SIZE).map((j) => (
              <li key={j.id}>
                <JobCard job={j} applied={appliedJobIds.includes(j.id)} />
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

function JobCard({ job, applied }: { job: Job; applied: boolean }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border p-4 text-sm transition-colors hover:bg-muted/50">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge>{job.category}</Badge>
          <span className="font-semibold">{job.jobType}</span>
        </div>
        <p>{job.company}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-muted-foreground">
          <dt>業種：</dt>
          <dd>{job.industry}</dd>
          <dt>勤務地：</dt>
          <dd>{job.location}</dd>
          <dt>給与：</dt>
          <dd className="font-medium text-foreground">{job.salary === null ? "—" : `${yen(job.salary)}／月`}</dd>
        </dl>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-xs text-muted-foreground">
          {job.corporateNo} {String(job.jobNo).padStart(2, "0")}
        </p>
        <ApplyButton jobId={job.id} applied={applied} />
      </div>
    </article>
  );
}
