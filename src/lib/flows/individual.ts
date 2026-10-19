import type { FlowDef, StepDef, WizardData } from "@/lib/wizard/types";

// 個人会員登録 BHALO010–026: the 17-step profile wizard.

const wants = (goal: string) => (data: WizardData) => data.values.preferences?.[goal] === true;

const jobWishFields = [
  { name: "job", label: "希望職種 (Desired job)", type: "combo", options: "industry" },
  { name: "salary", label: "希望給与 (Expected salary)", type: "select", options: "salary" },
  { name: "years", label: "在留希望年 (Years of stay)", type: "number", suffix: "年" },
  { name: "notes", label: "特記事項 (Notes)", type: "text", span: 2 },
] as const satisfies StepDef["fields"];

const steps: StepDef[] = [
  {
    slug: "basic",
    screenId: "BHALO010",
    title: "基本情報",
    titleEn: "Basic information",
    kind: "form",
    fields: [
      { name: "name", label: "氏名 (Full name)", type: "text", required: true, span: 2 },
      { name: "gender", label: "性別 (Gender)", type: "radio", options: "gender", required: true },
      { name: "birthDate", label: "生年月日 (Date of birth)", type: "date", required: true },
      { name: "hasSpouse", label: "配偶者有無 (Spouse)", type: "radio", options: "yesNo" },
      { name: "hasChildren", label: "子供有無 (Children)", type: "radio", options: "yesNo" },
      { name: "childCount", label: "子供人数 (Number of children)", type: "number", suffix: "人" },
    ],
    validate: (v) => {
      const e: Record<string, string> = {};
      if (!v.name) e.name = "氏名が入力されていません";
      if (!v.gender) e.gender = "性別が入力されていません";
      if (!v.birthDate) e.birthDate = "生年月日が入力されていません";
      return e;
    },
  },
  {
    slug: "address",
    screenId: "BHALO011",
    title: "住所情報",
    titleEn: "Your address",
    kind: "form",
    fields: [
      { name: "residenceCountry", label: "居住国 (Country of residence)", type: "combo", options: "country" },
      { name: "nationality", label: "国籍 (Nationality)", type: "combo", options: "country" },
      { name: "nativeLanguage", label: "母国語 (Native language)", type: "combo", options: "language" },
      { name: "mobile", label: "携帯番号 (Mobile)", type: "tel" },
      { name: "email", label: "メールアドレス (Email)", type: "email", span: 2 },
      { name: "postalCode", label: "郵便番号 (Postal code)", type: "text" },
      { name: "state", label: "州地区 (State / District)", type: "text" },
      { name: "city", label: "市 (City)", type: "text" },
      { name: "street", label: "町・ロード (Town / Road)", type: "text" },
      { name: "houseNumber", label: "番地 (House number)", type: "text" },
    ],
  },
  {
    slug: "photo",
    screenId: "BHALO012",
    title: "画像情報",
    titleEn: "Upload your image",
    kind: "form",
    fields: [
      {
        name: "photo",
        label: "顔写真 (Photo)",
        type: "file",
        accept: "image/jpeg,image/png",
        hint: "JPG・PNG / 縦 36〜40mm × 横 24〜30mm",
        span: 2,
      },
    ],
  },
  {
    slug: "visa",
    screenId: "BHALO013",
    title: "VISAの詳細",
    titleEn: "Visa details",
    description: "日本国内にお住まいの方は入力してください (If you live in Japan)",
    kind: "form",
    fields: [
      { name: "visaStatus", label: "現在のVISAステータス (Current visa status)", type: "select", options: "visa" },
      { name: "visaExpiry", label: "VISAの有効期限 (Visa expiry)", type: "yearMonth" },
    ],
    // All three empty → skip. Some filled → all are required (ERR0002).
    validate: (v): Record<string, string> => {
      const parts = [v.visaStatus, v.visaExpiryYear, v.visaExpiryMonth];
      const filled = parts.filter(Boolean).length;
      return filled > 0 && filled < parts.length
        ? { visaStatus: "入力内容が正しくありません (ステータス・年・月をすべて入力してください)" }
        : {};
    },
  },
  {
    slug: "languages",
    screenId: "BHALO014",
    title: "言語スキル",
    titleEn: "Language skills",
    kind: "rows",
    rowLabel: "言語",
    fields: [
      { name: "language", label: "言語 (Language)", type: "combo", options: "language" },
      { name: "level", label: "レベル (Level)", type: "combo", options: "languageLevel" },
    ],
  },
  {
    slug: "education",
    screenId: "BHALO015",
    title: "学歴",
    titleEn: "Educational background",
    kind: "rows",
    rowLabel: "学歴",
    fields: [
      { name: "degree", label: "学位 (Degree)", type: "combo", options: "degree" },
      { name: "school", label: "学校名 (School)", type: "text" },
      { name: "enrolled", label: "入学年月 (Enrolled)", type: "yearMonth" },
      { name: "graduated", label: "卒業年月 (Graduated)", type: "yearMonth" },
      { name: "passed", label: "パス年月 (Passed)", type: "yearMonth" },
      { name: "major", label: "専攻科目 (Major)", type: "text" },
    ],
  },
  {
    slug: "work",
    screenId: "BHALO016",
    title: "実務経験",
    titleEn: "Work experience",
    description: "実務経験のある方は入力してください (If you have work experience)",
    kind: "rows",
    rowLabel: "職歴",
    fields: [
      { name: "company", label: "会社名 (Company)", type: "text" },
      { name: "industry", label: "業種・職種 (Industry / Job)", type: "combo", options: "industry" },
      { name: "joined", label: "入社年月 (Joined)", type: "yearMonth" },
      { name: "left", label: "退職年月 (Left)", type: "yearMonth" },
    ],
  },
  {
    slug: "certifications",
    screenId: "BHALO017",
    title: "認定資格",
    titleEn: "Certifications",
    description: "認定資格をお持ちの方は入力してください (If you hold certifications)",
    kind: "rows",
    rowLabel: "資格",
    fields: [
      { name: "name", label: "資格名 (Certification)", type: "combo" },
      { name: "certificate", label: "証明書タイトル (Certificate title)", type: "combo" },
      { name: "acquired", label: "取得年月 (Acquired)", type: "yearMonth" },
    ],
  },
  {
    slug: "introduction",
    screenId: "BHALO018",
    title: "自己紹介",
    titleEn: "Self introduction",
    kind: "form",
    fields: [
      { name: "introduction", label: "自己紹介 (About you)", type: "textarea", rows: 8, maxLength: 4000, span: 2 },
    ],
  },
  {
    slug: "preferences",
    screenId: "BHALO019",
    title: "求職希望・留学希望 選択",
    titleEn: "Select your preference",
    description: "希望する項目をすべてチェックしてください (Check everything that applies)",
    kind: "form",
    fields: [
      {
        name: "goals",
        label: "希望 (Preferences)",
        type: "checkboxes",
        span: 2,
        groups: [
          {
            title: "求職希望 (Job seeking)",
            items: [
              { name: "engineer", label: "技人国での求職希望 (Engineer / Specialist)" },
              { name: "ssw", label: "特定技能での求職希望 (SSW)" },
              { name: "titp", label: "技能実習での求職希望 (TITP)" },
            ],
          },
          {
            title: "留学希望 (Study in Japan)",
            items: [
              { name: "university", label: "大学・大学院への留学希望 (University / Graduate school)" },
              { name: "vocational", label: "専門学校への留学希望 (Vocational school)" },
              { name: "languageSchool", label: "日本語学校への留学希望 (Japanese language school)" },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "regions",
    screenId: "BHALO020",
    title: "希望地域指定",
    titleEn: "Preferred area",
    description: "希望の国、地域のある方は入力してください (If you have a preferred area)",
    kind: "rows",
    rowLabel: "地域",
    fields: [
      { name: "country", label: "国 (Country)", type: "combo", options: "country" },
      { name: "region", label: "地方 (Region)", type: "text" },
      { name: "prefecture", label: "県 (Prefecture)", type: "text" },
      { name: "city", label: "市区郡 (City)", type: "text" },
      { name: "free", label: "フリー記載 (Other)", type: "text", span: 2 },
    ],
  },
  {
    slug: "engineer",
    screenId: "BHALO021",
    title: "技人国",
    titleEn: "Engineer / Specialist in Humanities",
    description: "技人国で希望のある方は入力してください",
    kind: "rows",
    rowLabel: "希望",
    when: wants("engineer"),
    fields: [...jobWishFields],
  },
  {
    slug: "ssw",
    screenId: "BHALO022",
    title: "特定技能",
    titleEn: "Specified Skilled Worker (SSW)",
    description: "特定技能で希望のある方、試験合格済みの方は入力してください",
    kind: "rows",
    rowLabel: "希望",
    when: wants("ssw"),
    fields: [
      ...jobWishFields.slice(0, 3),
      { name: "test", label: "特定技能試験 (SSW exam)", type: "select", options: "sswTest" },
      jobWishFields[3],
    ],
  },
  {
    slug: "titp",
    screenId: "BHALO023",
    title: "技能実習",
    titleEn: "Technical Intern Training (TITP)",
    description: "技能実習で希望のある方は入力してください",
    kind: "rows",
    rowLabel: "希望",
    when: wants("titp"),
    fields: [...jobWishFields],
  },
  {
    slug: "university",
    screenId: "BHALO024",
    title: "大学・大学院 留学希望",
    titleEn: "University / Graduate school",
    description: "留学先で希望のある方は入力してください",
    kind: "rows",
    rowLabel: "希望",
    when: wants("university"),
    fields: [
      { name: "type", label: "大学/院 (Type)", type: "select", options: "universityType" },
      { name: "school", label: "希望学校名 (School)", type: "text" },
      { name: "faculty", label: "希望学部 (Faculty)", type: "combo", options: "faculty" },
      { name: "department", label: "希望学科 (Department)", type: "combo" },
      { name: "notes", label: "特記事項 (Notes)", type: "text", span: 2 },
    ],
  },
  {
    slug: "vocational",
    screenId: "BHALO025",
    title: "専門学校 留学希望",
    titleEn: "Vocational school",
    description: "留学先で希望のある方は入力してください",
    kind: "rows",
    rowLabel: "希望",
    when: wants("vocational"),
    fields: [
      { name: "school", label: "希望学校名 (School)", type: "text" },
      { name: "faculty", label: "希望学部 (Faculty)", type: "combo", options: "faculty" },
      { name: "department", label: "希望学科 (Department)", type: "combo" },
      { name: "notes", label: "特記事項 (Notes)", type: "text", span: 2 },
    ],
  },
  {
    slug: "language-school",
    screenId: "BHALO026",
    title: "日本語学校 留学希望",
    titleEn: "Japanese language school",
    description: "留学先で希望のある方は入力してください",
    kind: "rows",
    rowLabel: "希望",
    when: wants("languageSchool"),
    fields: [
      { name: "school", label: "希望学校名 (School)", type: "text" },
      { name: "notes", label: "特記事項 (Notes)", type: "text", span: 2 },
    ],
  },
];

export const individualFlow: FlowDef = {
  id: "individual",
  title: "プロフィール作成 (Create your profile)",
  basePath: "/profile",
  steps,
  startHref: "/register/individual",
  finishHref: "/mypage",
  finishLabel: "登録してマイページへ",
};
