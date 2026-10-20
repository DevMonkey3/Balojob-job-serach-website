// Labels and formatting for the admin console. Safe for client components.

import { jobTrackLabels, schoolCategoryLabels } from "@/lib/format";

export type Option = { value: string; label: string };

export const trackOptions: Option[] = (Object.keys(jobTrackLabels) as (keyof typeof jobTrackLabels)[]).map(
  (value) => ({ value, label: jobTrackLabels[value] }),
);

export const schoolCategoryOptions: Option[] = (
  Object.keys(schoolCategoryLabels) as (keyof typeof schoolCategoryLabels)[]
).map((value) => ({ value, label: schoolCategoryLabels[value] }));

export const activeFilterOptions: Option[] = [
  { value: "", label: "すべて" },
  { value: "active", label: "アクティブ" },
  { value: "inactive", label: "非アクティブ" },
];

export const yesNoOptions: Option[] = [
  { value: "1", label: "有り" },
  { value: "0", label: "無し" },
];

export const applicationStatusLabels = {
  new: "新規",
  in_progress: "対応中",
  closed: "完了",
} as const;

export const sswTestLabels = {
  passed: "合格",
  in_progress: "受験中",
  not_taken: "未受験",
} as const;

export const universityLevelLabels = {
  undergraduate: "大学",
  graduate: "大学院",
} as const;

export const accountTypeLabels = {
  individual: "個人",
  corporate: "法人",
  staff: "スタッフ",
} as const;

export const toOptions = (labels: Record<string, string>): Option[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const JST = "Asia/Tokyo";

/** 2026/10/15 */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ja-JP", { timeZone: JST, year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 2026/10/15 14:05 */
export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleString("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const fmtNumber = (n: number | null | undefined) => (n === null || n === undefined ? "" : n.toLocaleString("ja-JP"));
