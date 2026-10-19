// Display labels for database enums, and number formatting. Safe for client components.

export const jobTrackLabels = {
  engineer: "技人国",
  ssw: "特定技能",
  titp: "技能実習",
} as const;

export const schoolCategoryLabels = {
  university: "大学・大学院",
  vocational: "専門学校",
  language_school: "日本語学校",
} as const;

export type JobTrackLabel = (typeof jobTrackLabels)[keyof typeof jobTrackLabels];
export type SchoolCategoryLabel = (typeof schoolCategoryLabels)[keyof typeof schoolCategoryLabels];

export const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;
