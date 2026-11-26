import Link from "next/link";
import {
  BanknoteIcon,
  Building2Icon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { yen } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Job, JobTrackKey } from "@/server/listings";

// Links here do not pre-load their target (prefetch={false}): a list shows 20
// cards, and pre-loading every job would multiply the requests per page view.
//
// One job in a list: the top page, 求人検索 and My Page all use it, so a job
// looks the same everywhere. Candidates see the company's name and its
// 許可・登録番号 only; contact details are never part of a Job.

const trackStyle: Record<JobTrackKey, string> = {
  engineer: "border-sky-200 bg-sky-50 text-sky-800",
  ssw: "border-orange-200 bg-orange-50 text-orange-800",
  titp: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function TrackBadge({ track, label, className }: { track: JobTrackKey; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-md border px-2 text-xs font-semibold", trackStyle[track], className)}>
      {label}
    </span>
  );
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-md border bg-background px-2 text-xs text-foreground/80", className)}>
      {children}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex h-6 items-center rounded-md bg-brand-red px-2 text-[11px] font-bold tracking-wide text-white">NEW</span>
  );
}

/** "寮完備・日本語学習支援" → ["寮完備", "日本語学習支援"]. */
export const featureTags = (features: string) =>
  features
    .split(/[・、,，/／\n]+/)
    .map((f) => f.trim())
    .filter((f) => f && f.length <= 16);

export const jobTitle = (job: Pick<Job, "jobType" | "workName" | "category">) =>
  job.jobType || job.workName || `${job.category}の求人`;

export const salaryText = (salary: number | null) => (salary === null ? "応相談" : `月給 ${yen(salary)}`);

type Props = {
  job: Job;
  /** Extra control beside 詳細を見る (the apply button on My Page). */
  action?: React.ReactNode;
  /** Grid tiles on the top page: no description, no footer line. */
  compact?: boolean;
  className?: string;
};

export function JobCard({ job, action, compact = false, className }: Props) {
  const href = `/jobs/${job.id}`;
  const tags = featureTags(job.features).slice(0, compact ? 2 : 4);

  return (
    <article
      className={cn(
        "group/job relative flex h-full flex-col rounded-xl border bg-card text-sm shadow-xs transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className={cn("flex flex-1 flex-col gap-3", compact ? "p-4" : "p-5")}>
        <div className="flex flex-wrap items-center gap-1.5">
          {job.isNew && <NewBadge />}
          <TrackBadge track={job.track} label={job.category} />
          {job.employmentType && <Tag>{job.employmentType}</Tag>}
          {job.industry && <Tag>{job.industry}</Tag>}
        </div>

        <div className="flex flex-col gap-1">
          <h3 className={cn("font-bold leading-snug", compact ? "text-base" : "text-lg")}>
            {/* The whole card is the link; other controls sit above it (z-10). */}
            <Link href={href} prefetch={false} className="text-primary outline-none after:absolute after:inset-0 after:rounded-xl hover:underline focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
              {jobTitle(job)}
              {job.workName && job.jobType && <span className="font-medium text-foreground/70">（{job.workName}）</span>}
            </Link>
          </h3>
          <p className="flex items-center gap-1.5 text-foreground/80">
            <Building2Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {job.company}
          </p>
        </div>

        {!compact && job.description && <p className="line-clamp-2 text-muted-foreground">{job.description}</p>}

        <dl className={cn("grid gap-x-6 gap-y-1.5", !compact && "sm:grid-cols-2")}>
          <Fact icon={MapPinIcon} label="勤務地" value={job.location || "—"} />
          <Fact icon={BanknoteIcon} label="給与" value={salaryText(job.salary)} strong />
          {!compact && job.hours && <Fact icon={ClockIcon} label="勤務時間" value={job.hours} />}
          {!compact && job.holidays && <Fact icon={FileTextIcon} label="休日" value={job.holidays} />}
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

      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t bg-muted/50 px-5 py-3">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {job.licenseNo && (
              <span className="flex items-center gap-1">
                <ShieldCheckIcon className="size-3.5" aria-hidden />
                許可・登録番号 {job.licenseNo}
              </span>
            )}
            <span>掲載日 {job.postedOn}</span>
          </p>
          <div className="relative z-10 flex items-center gap-2">
            {action}
            <Link href={href} prefetch={false} className={buttonVariants({ variant: "outline", size: "sm" })} tabIndex={-1} aria-hidden>
              詳細を見る
              <ChevronRightIcon />
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}

function Fact({
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
    <div className="flex items-start gap-2">
      <dt className="flex shrink-0 items-center gap-1 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className={cn("min-w-0", strong && "font-semibold text-foreground")}>{value}</dd>
    </div>
  );
}
