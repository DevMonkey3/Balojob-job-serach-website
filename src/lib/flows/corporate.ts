import type { FlowDef, StepDef } from "@/lib/wizard/types";

// 法人会員登録: 企業 BHALO111–116, 学校 BHALO151–156.
// 対象選択 (BHALO110) has its own page because it decides which flow runs.

const addressFields: StepDef["fields"] = [
  { name: "postalCode", label: "郵便番号 (Postal code)", type: "text" },
  { name: "prefecture", label: "県 (Prefecture)", type: "text" },
  { name: "city", label: "市区郡 (City)", type: "text" },
  { name: "town", label: "町 (Town)", type: "text" },
  { name: "houseNumber", label: "番地 (Address line)", type: "text" },
  { name: "contact", label: "ご担当者 (Contact person)", type: "text" },
  { name: "phone", label: "電話番号 (Phone)", type: "tel" },
  { name: "email", label: "メールアドレス (Email)", type: "email" },
];

const logoField: StepDef["fields"] = [
  {
    name: "logo",
    label: "ロゴ画像 (Logo)",
    type: "file",
    accept: "image/jpeg,image/png",
    hint: "JPG・PNG",
    span: 2,
  },
];

const requireNameAndRep = (nameLabel: string) => (v: Record<string, unknown>) => {
  const e: Record<string, string> = {};
  if (!v.name) e.name = `${nameLabel}が入力されていません`;
  if (!v.representative) e.representative = "代表者名が入力されていません";
  return e;
};

export const companyFlow: FlowDef = {
  id: "company",
  title: "企業プロフィール作成 (Company profile)",
  basePath: "/corporate/company",
  startHref: "/corporate/target",
  finishHref: "/corporate/complete",
  finishLabel: "登録終了",
  steps: [
    {
      slug: "basic",
      screenId: "BHALO111",
      title: "基本情報1",
      titleEn: "Basic information 1",
      kind: "form",
      fields: [
        { name: "name", label: "法人名 (Company name)", type: "text", required: true, span: 2 },
        { name: "kana", label: "フリガナ (Kana)", type: "text", span: 2 },
        { name: "founded", label: "創業 (Founded)", type: "text" },
        { name: "representative", label: "代表者名 (Representative)", type: "text", required: true },
        { name: "capital", label: "資本金 (Capital)", type: "number", suffix: "万円" },
        { name: "employees", label: "従業員数 (Employees)", type: "number", suffix: "人" },
        { name: "industry", label: "業種 (Industry)", type: "combo", options: "industry" },
        { name: "url", label: "URL", type: "url" },
      ],
      validate: requireNameAndRep("会社・団体名"),
    },
    {
      slug: "address",
      screenId: "BHALO112",
      title: "基本情報2",
      titleEn: "Basic information 2",
      kind: "form",
      fields: addressFields,
    },
    {
      slug: "logo",
      screenId: "BHALO113",
      title: "企業ロゴ画像情報",
      titleEn: "Company logo",
      kind: "form",
      fields: logoField,
    },
    {
      slug: "introduction",
      screenId: "BHALO114",
      title: "企業紹介文",
      titleEn: "Company introduction",
      kind: "form",
      fields: [
        { name: "introduction", label: "企業紹介文 (Introduction)", type: "textarea", rows: 8, maxLength: 4000, span: 2 },
      ],
    },
    {
      slug: "jobs",
      screenId: "BHALO115 / BHALO116",
      title: "求人情報",
      titleEn: "Job information",
      description: "業種、職種別にご登録ください (Register one per industry / job type)",
      kind: "rows",
      rowLabel: "求人",
      fields: [
        { name: "category", label: "求人種別 (Category)", type: "select", options: "jobCategory" },
        { name: "industry", label: "業種 (Industry)", type: "combo", options: "industry" },
        { name: "jobType", label: "職種 (Job type)", type: "combo" },
        { name: "workName", label: "作業名 (Work name)", type: "text" },
        { name: "employmentType", label: "雇用形態 (Employment type)", type: "text" },
        { name: "location", label: "勤務地 (Location)", type: "text" },
        { name: "hoursFrom", label: "勤務時間 開始 (From)", type: "time" },
        { name: "hoursTo", label: "勤務時間 終了 (To)", type: "time" },
        { name: "holidays", label: "休日 (Holidays)", type: "text" },
        { name: "salary", label: "給与 (Salary)", type: "number", suffix: "円/月額" },
        { name: "contact", label: "ご担当者 (Contact)", type: "text" },
        { name: "email", label: "メールアドレス (Email)", type: "email" },
        { name: "description", label: "業務内容 (Duties)", type: "textarea", rows: 3, span: 2 },
        { name: "features", label: "会社の特長 (Company features)", type: "textarea", rows: 3, span: 2 },
      ],
    },
  ],
};

export const schoolFlow: FlowDef = {
  id: "school",
  title: "学校プロフィール作成 (School profile)",
  basePath: "/corporate/school",
  startHref: "/corporate/target",
  finishHref: "/corporate/complete",
  finishLabel: "登録終了",
  steps: [
    {
      slug: "basic",
      screenId: "BHALO151",
      title: "基本情報1",
      titleEn: "Basic information 1",
      kind: "form",
      fields: [
        { name: "name", label: "学校名 (School name)", type: "text", required: true, span: 2 },
        { name: "kana", label: "フリガナ (Kana)", type: "text", span: 2 },
        { name: "founded", label: "創立 (Founded)", type: "text" },
        { name: "representative", label: "代表者名 (Representative)", type: "text", required: true },
        { name: "students", label: "生徒数 (Students)", type: "number", suffix: "人" },
        { name: "url", label: "URL", type: "url" },
      ],
      validate: requireNameAndRep("学校名"),
    },
    {
      slug: "address",
      screenId: "BHALO152",
      title: "基本情報2",
      titleEn: "Basic information 2",
      kind: "form",
      fields: addressFields,
    },
    {
      slug: "logo",
      screenId: "BHALO153",
      title: "学校ロゴ画像情報",
      titleEn: "School logo",
      kind: "form",
      fields: logoField,
    },
    {
      slug: "introduction",
      screenId: "BHALO154",
      title: "学校紹介文",
      titleEn: "School introduction",
      kind: "form",
      fields: [
        { name: "introduction", label: "学校紹介文 (Introduction)", type: "textarea", rows: 8, maxLength: 4000, span: 2 },
      ],
    },
    {
      slug: "recruitment",
      screenId: "BHALO155 / BHALO156",
      title: "生徒募集情報",
      titleEn: "Student recruitment",
      description: "学部、学科別にご登録ください (Register one per faculty / department)",
      kind: "rows",
      rowLabel: "募集",
      fields: [
        { name: "faculty", label: "学部 (Faculty)", type: "combo", options: "faculty" },
        { name: "department", label: "学科 (Department)", type: "combo" },
        { name: "schoolGender", label: "学校種別 (School type)", type: "select", options: "schoolGender" },
        { name: "location", label: "所在地 (Location)", type: "text" },
        { name: "capacity", label: "募集人員 (Places)", type: "number", suffix: "人" },
        { name: "tuition", label: "学費 (Tuition)", type: "number", suffix: "円/年" },
        { name: "contact", label: "ご担当者 (Contact)", type: "text" },
        { name: "email", label: "メールアドレス (Email)", type: "email" },
        { name: "notes", label: "特記事項 (Notes)", type: "textarea", rows: 3, span: 2 },
      ],
    },
  ],
};
