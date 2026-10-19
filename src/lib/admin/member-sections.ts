// The child tables of an individual member (言語スキル, 学歴, …) as editable row
// sections on BHALO806. Each wizard screen (BHALO014–026, 202) becomes one
// section; the same definitions drive the rows editor and name the inputs
// (`rows.<index>.<field>`) that the server action reads back.
// Safe for client components: no server imports.

import {
  schoolCategoryOptions,
  sswTestLabels,
  toOptions,
  trackOptions,
  universityLevelLabels,
  type Option,
} from "@/lib/admin/labels";

export type SectionKey =
  | "languages"
  | "educations"
  | "workExperiences"
  | "certifications"
  | "preferredAreas"
  | "jobWishes"
  | "studyWishes"
  | "familyMembers";

/** Keys of the option lists a section can refer to. The page loads the master-backed ones. */
export type SectionOptionKey =
  | "language"
  | "languageLevel"
  | "degree"
  | "industry"
  | "country"
  | "salary"
  | "faculty"
  | "department"
  | "familyRelation"
  | "track"
  | "sswTest"
  | "schoolCategory"
  | "universityLevel";

export type SectionOptionLists = Partial<Record<SectionOptionKey, readonly (Option | string)[]>>;

export type SectionField = {
  name: string;
  label: string;
  /** "text" with `options` renders a datalist (選択 or 手入力); "select" is fixed choices. */
  type: "text" | "select" | "month" | "date" | "number";
  options?: SectionOptionKey;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Tailwind width of the input column. */
  width?: string;
};

export type SectionDef = {
  key: SectionKey;
  title: string;
  screenId: string;
  description?: string;
  fields: SectionField[];
};

/** Options that come from code rather than the 選択項目マスタ. */
export const staticSectionOptions: SectionOptionLists = {
  track: trackOptions,
  sswTest: toOptions(sswTestLabels),
  schoolCategory: schoolCategoryOptions,
  universityLevel: toOptions(universityLevelLabels),
};

export const memberSections: SectionDef[] = [
  {
    key: "languages",
    title: "言語スキル",
    screenId: "BHALO014",
    fields: [
      { name: "language", label: "言語", type: "text", options: "language", required: true, maxLength: 30, width: "w-44" },
      { name: "level", label: "レベル", type: "text", options: "languageLevel", maxLength: 20, width: "w-40" },
    ],
  },
  {
    key: "educations",
    title: "学歴",
    screenId: "BHALO015",
    fields: [
      { name: "degree", label: "学位", type: "text", options: "degree", maxLength: 80, width: "w-36" },
      { name: "schoolName", label: "学校名", type: "text", maxLength: 120, width: "w-56" },
      { name: "enrolledOn", label: "入学年月", type: "month", width: "w-40" },
      { name: "graduatedOn", label: "卒業年月", type: "month", width: "w-40" },
      { name: "passedOn", label: "パス年月", type: "month", width: "w-40" },
      { name: "major", label: "専攻科目", type: "text", maxLength: 80, width: "w-44" },
    ],
  },
  {
    key: "workExperiences",
    title: "実務経験",
    screenId: "BHALO016",
    fields: [
      { name: "companyName", label: "会社名", type: "text", maxLength: 80, width: "w-56" },
      { name: "industry", label: "業種・職種", type: "text", options: "industry", maxLength: 120, width: "w-48" },
      { name: "joinedOn", label: "入社年月", type: "month", width: "w-40" },
      { name: "leftOn", label: "退職年月", type: "month", width: "w-40" },
    ],
  },
  {
    key: "certifications",
    title: "認定資格",
    screenId: "BHALO017",
    fields: [
      { name: "name", label: "資格名", type: "text", required: true, maxLength: 120, width: "w-56" },
      { name: "certificateTitle", label: "証明書タイトル", type: "text", maxLength: 120, width: "w-56" },
      { name: "acquiredOn", label: "取得年月", type: "month", width: "w-40" },
    ],
  },
  {
    key: "preferredAreas",
    title: "希望地域指定",
    screenId: "BHALO020",
    fields: [
      { name: "country", label: "国", type: "text", options: "country", maxLength: 120, width: "w-40" },
      { name: "region", label: "地方", type: "text", maxLength: 120, width: "w-36" },
      { name: "prefecture", label: "県", type: "text", maxLength: 120, width: "w-36" },
      { name: "city", label: "市区郡", type: "text", maxLength: 120, width: "w-36" },
      { name: "freeText", label: "フリー記載", type: "text", maxLength: 300, width: "w-64" },
    ],
  },
  {
    key: "jobWishes",
    title: "求職希望",
    screenId: "BHALO021–023",
    description: "技人国・特定技能・技能実習の希望。特定技能試験は種別が特定技能の行でのみ保存されます。",
    fields: [
      { name: "track", label: "種別", type: "select", options: "track", required: true, width: "w-32" },
      { name: "desiredJob", label: "希望職種", type: "text", options: "industry", maxLength: 120, width: "w-48" },
      { name: "desiredSalary", label: "希望給与", type: "select", options: "salary", width: "w-44" },
      { name: "yearsOfStay", label: "在留希望年", type: "number", min: 0, max: 99, width: "w-24" },
      { name: "sswTest", label: "特定技能試験", type: "select", options: "sswTest", width: "w-32" },
      { name: "notes", label: "特記事項", type: "text", maxLength: 300, width: "w-56" },
    ],
  },
  {
    key: "studyWishes",
    title: "留学希望",
    screenId: "BHALO024–026",
    description: "大学・大学院・専門学校・日本語学校の希望。大学/院は区分が大学・大学院の行でのみ保存されます。",
    fields: [
      { name: "schoolCategory", label: "区分", type: "select", options: "schoolCategory", required: true, width: "w-36" },
      { name: "universityLevel", label: "大学/院", type: "select", options: "universityLevel", width: "w-28" },
      { name: "schoolName", label: "希望学校名", type: "text", maxLength: 120, width: "w-52" },
      { name: "faculty", label: "希望学部", type: "text", options: "faculty", maxLength: 120, width: "w-40" },
      { name: "department", label: "希望学科", type: "text", options: "department", maxLength: 120, width: "w-40" },
      { name: "notes", label: "特記事項", type: "text", maxLength: 300, width: "w-56" },
    ],
  },
  {
    key: "familyMembers",
    title: "家族構成",
    screenId: "BHALO202",
    description: "履歴書に印刷されます。",
    fields: [
      { name: "relation", label: "関係", type: "text", options: "familyRelation", maxLength: 50, width: "w-32" },
      { name: "fullName", label: "氏名", type: "text", maxLength: 80, width: "w-48" },
      { name: "birthDate", label: "生年月日", type: "date", width: "w-40" },
      { name: "address", label: "現住所", type: "text", maxLength: 120, width: "w-56" },
      { name: "occupation", label: "職業", type: "text", maxLength: 80, width: "w-40" },
    ],
  },
];

export const sectionKeys = memberSections.map((s) => s.key) as [SectionKey, ...SectionKey[]];
