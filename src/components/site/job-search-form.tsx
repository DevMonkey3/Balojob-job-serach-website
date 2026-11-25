import { BriefcaseIcon, FactoryIcon, MapPinIcon, SearchIcon, WalletIcon } from "lucide-react";
import { jobTrackLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

// 求人検索 as a plain GET form to /jobs: it works before any JavaScript loads
// and every search is a URL that can be shared or bookmarked.

export const minSalaryOptions = [
  { value: "180000", label: "18万円以上" },
  { value: "200000", label: "20万円以上" },
  { value: "250000", label: "25万円以上" },
  { value: "300000", label: "30万円以上" },
];

export type SearchValues = {
  track?: string;
  industry?: string;
  employment?: string;
  loc?: string;
  q?: string;
  min?: string;
};

const control =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        control,
        "select-chevron appearance-none pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextControl({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

function Field({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-foreground/80", className)}>
      <span className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-primary" aria-hidden />
        {label}
      </span>
      {children}
    </label>
  );
}

/** The wide search bar on the top page. */
export function JobSearchBar({ industries, className }: { industries: string[]; className?: string }) {
  return (
    <form
      action="/jobs"
      method="get"
      role="search"
      aria-label="求人検索"
      className={cn("grid gap-3 rounded-2xl border bg-card p-4 shadow-lg shadow-brand-orange/10 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-end", className)}
    >
      <Field icon={BriefcaseIcon} label="在留資格">
        <NativeSelect name="track" defaultValue="">
          <option value="">すべて</option>
          {Object.entries(jobTrackLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field icon={FactoryIcon} label="業種">
        <NativeSelect name="industry" defaultValue="">
          <option value="">すべて</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field icon={MapPinIcon} label="勤務地">
        <TextControl name="loc" placeholder="例：東京、横浜" maxLength={40} />
      </Field>
      <Field icon={SearchIcon} label="キーワード">
        <TextControl name="q" placeholder="職種・仕事内容など" maxLength={60} />
      </Field>
      <button
        type="submit"
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red px-7 text-sm font-bold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:translate-y-px sm:col-span-2 lg:col-span-1"
      >
        <SearchIcon className="size-4" aria-hidden />
        求人を検索
      </button>
    </form>
  );
}

/** The filter panel beside the results on /jobs. */
export function JobFilterForm({
  industries,
  employmentTypes,
  values,
}: {
  industries: string[];
  employmentTypes: string[];
  values: SearchValues;
}) {
  return (
    <form action="/jobs" method="get" role="search" aria-label="検索条件" className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
          <BriefcaseIcon className="size-3.5 text-primary" aria-hidden />
          在留資格
        </legend>
        {[["", "すべて"], ...Object.entries(jobTrackLabels)].map(([value, label]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="track"
              value={value}
              defaultChecked={(values.track ?? "") === value}
              className="size-4 accent-[var(--primary)]"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <Field icon={FactoryIcon} label="業種">
        <NativeSelect name="industry" defaultValue={values.industry ?? ""} className="h-10">
          <option value="">すべて</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field icon={MapPinIcon} label="勤務地">
        <TextControl name="loc" defaultValue={values.loc ?? ""} placeholder="例：東京、横浜" maxLength={40} className="h-10" />
      </Field>
      <Field icon={WalletIcon} label="月給">
        <NativeSelect name="min" defaultValue={values.min ?? ""} className="h-10">
          <option value="">指定なし</option>
          {minSalaryOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {employmentTypes.length > 0 && (
        <Field icon={BriefcaseIcon} label="雇用形態">
          <NativeSelect name="employment" defaultValue={values.employment ?? ""} className="h-10">
            <option value="">すべて</option>
            {employmentTypes.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field icon={SearchIcon} label="キーワード">
        <TextControl name="q" defaultValue={values.q ?? ""} placeholder="職種・仕事内容など" maxLength={60} className="h-10" />
      </Field>
      <button
        type="submit"
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red text-sm font-bold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:translate-y-px"
      >
        <SearchIcon className="size-4" aria-hidden />
        この条件で検索
      </button>
    </form>
  );
}
