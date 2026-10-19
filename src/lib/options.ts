// Stand-in for 選択項目マスタ (selection master) for the public wizard. Values are
// the Japanese labels in db/seed.sql, so what the wizard stores matches what the
// admin console (which reads the database) shows. Keys follow the level-1 codes
// in オブジェクト定義書.

export type Option = { value: string; label: string };

const opts = (...labels: string[]): Option[] =>
  labels.map((label) => ({ value: label, label }));

/** Japanese value with an English hint in the label. */
const bilingual = (...pairs: [ja: string, en: string][]): Option[] =>
  pairs.map(([ja, en]) => ({ value: ja, label: `${ja} (${en})` }));

// Fixed range on purpose: reading the clock during a server render breaks
// prerendering under Cache Components.
const YEARS = Array.from({ length: 71 }, (_, i) => String(2040 - i));

export const options = {
  // 01 性別
  gender: bilingual(["男性", "Male"], ["女性", "Female"]),
  // 02 有無
  yesNo: [
    { value: "1", label: "有り (Yes)" },
    { value: "0", label: "無し (No)" },
  ],
  // 03 VISA
  visa: opts(
    "技術・人文知識・国際業務",
    "特定技能1号",
    "特定技能2号",
    "技能実習",
    "育成就労",
    "留学",
    "家族滞在",
    "永住者",
    "定住者",
    "その他",
  ),
  // 04 言語
  language: bilingual(["ベンガル語", "Bengali"], ["英語", "English"], ["日本語", "Japanese"], ["ヒンディー語", "Hindi"]),
  // 04 → 言語レベル (N1–N5 are the 日本語 children in the master)
  languageLevel: [
    ...bilingual(["ネイティブ", "Native"], ["ビジネス", "Business"], ["日常会話", "Conversational"], ["初級", "Basic"]),
    ...opts("N1", "N2", "N3", "N4", "N5"),
  ],
  // 05 学位
  degree: opts("中学", "高校", "短大", "大学", "大学院", "専門学校"),
  // 06 業種・職種
  industry: opts(
    "介護",
    "建設",
    "農業",
    "漁業",
    "飲食料品製造",
    "外食",
    "自動車整備",
    "ビルクリーニング",
    "宿泊",
    "IT",
    "製造",
  ),
  // 08 国
  country: opts("日本", "バングラデシュ", "フィリピン", "ミャンマー", "ベトナム", "ネパール"),
  // 12 給与
  salary: opts(
    "〜180,000円",
    "180,000〜200,000円",
    "200,000〜250,000円",
    "250,000〜300,000円",
    "300,000円〜",
  ),
  // 13 特定試験
  sswTest: opts("合格", "受験中", "未受験"),
  // 14 大学区分
  universityType: opts("大学", "大学院"),
  // 15 学部
  faculty: opts("経済学部", "経営学部", "法学部", "工学部", "情報学部", "文学部", "国際学部"),
  // 16 / 17 年・月
  year: YEARS.map((y) => ({ value: y, label: `${y}年` })),
  month: Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => ({
    value: m,
    label: `${m}月`,
  })),
  // 18 学校種別
  schoolGender: opts("共学", "男子校", "女子校"),
  // 21 種別(求人)
  jobCategory: opts("技人国", "特定技能", "技能実習"),
  // 22 種別(学校)
  schoolCategory: opts("大学・大学院", "専門学校", "日本語学校"),
} satisfies Record<string, Option[]>;

export type OptionKey = keyof typeof options;
