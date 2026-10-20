-- =============================================================================
-- Master data: dropdown values, popular industries, settings.
-- Run with `npm run db:seed` after the migrations. Same values as src/lib/options.ts.
-- =============================================================================

BEGIN;

-- Running it twice would duplicate every list, so stop if it already ran.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM selection_options) THEN
    RAISE EXCEPTION 'Master data is already loaded (selection_options is not empty). Nothing was changed.';
  END IF;
END;
$$;

-- Helper: insert a flat list for one category, keeping the given order.
CREATE TEMP TABLE _opts (category text, label_ja text, label_en text, ord int) ON COMMIT DROP;

INSERT INTO _opts VALUES
  ('gender', '男性', 'Male', 1), ('gender', '女性', 'Female', 2),
  ('visa', '技術・人文知識・国際業務', 'Engineer / Specialist in Humanities / International Services', 1),
  ('visa', '特定技能1号', 'Specified Skilled Worker (i)', 2),
  ('visa', '特定技能2号', 'Specified Skilled Worker (ii)', 3),
  ('visa', '技能実習', 'Technical Intern Training', 4),
  ('visa', '育成就労', 'Employment for Skill Development', 5),
  ('visa', '留学', 'Student', 6),
  ('visa', '家族滞在', 'Dependent', 7),
  ('visa', '永住者', 'Permanent Resident', 8),
  ('visa', '定住者', 'Long-Term Resident', 9),
  ('visa', 'その他', 'Other', 10),
  ('degree', '中学', 'Junior high school', 1), ('degree', '高校', 'High school', 2),
  ('degree', '短大', 'Junior college', 3), ('degree', '大学', 'University', 4),
  ('degree', '大学院', 'Graduate school', 5), ('degree', '専門学校', 'Vocational school', 6),
  ('country', '日本', 'Japan', 1), ('country', 'バングラデシュ', 'Bangladesh', 2),
  ('country', 'フィリピン', 'Philippines', 3), ('country', 'ミャンマー', 'Myanmar', 4),
  ('country', 'ベトナム', 'Vietnam', 5), ('country', 'ネパール', 'Nepal', 6),
  ('salary', '〜180,000円', 'Up to ¥180,000', 1),
  ('salary', '180,000〜200,000円', '¥180,000–200,000', 2),
  ('salary', '200,000〜250,000円', '¥200,000–250,000', 3),
  ('salary', '250,000〜300,000円', '¥250,000–300,000', 4),
  ('salary', '300,000円〜', '¥300,000 and up', 5),
  ('school_gender', '共学', 'Co-ed', 1), ('school_gender', '男子校', 'Boys', 2), ('school_gender', '女子校', 'Girls', 3),
  ('family_relation', '父', 'Father', 1), ('family_relation', '母', 'Mother', 2),
  ('family_relation', '兄', 'Older brother', 3), ('family_relation', '姉', 'Older sister', 4),
  ('family_relation', '弟', 'Younger brother', 5), ('family_relation', '妹', 'Younger sister', 6),
  ('family_relation', '配偶者', 'Spouse', 7), ('family_relation', '子', 'Child', 8),
  ('dominant_hand', '右手', 'Right', 1), ('dominant_hand', '左手', 'Left', 2),
  ('language_level', 'ネイティブ', 'Native', 1), ('language_level', 'ビジネス', 'Business', 2),
  ('language_level', '日常会話', 'Conversational', 3), ('language_level', '初級', 'Basic', 4);

INSERT INTO selection_options (category, label_ja, label_en, sort_order)
SELECT category, label_ja, label_en, ord FROM _opts ORDER BY category, ord;

-- Two-level lists: parent rows first, then children pointing at them.
CREATE TEMP TABLE _tree (category text, parent text, label_ja text, label_en text, ord int) ON COMMIT DROP;

INSERT INTO _tree VALUES
  -- 言語 (JLPT levels hang under 日本語; general levels are the flat 'language_level' list)
  ('language', NULL, 'ベンガル語', 'Bengali', 1),
  ('language', NULL, '英語', 'English', 2),
  ('language', NULL, '日本語', 'Japanese', 3),
  ('language', NULL, 'ヒンディー語', 'Hindi', 4),
  ('language', '日本語', 'N1', 'JLPT N1', 1),
  ('language', '日本語', 'N2', 'JLPT N2', 2),
  ('language', '日本語', 'N3', 'JLPT N3', 3),
  ('language', '日本語', 'N4', 'JLPT N4', 4),
  ('language', '日本語', 'N5', 'JLPT N5', 5),
  -- 業種 → 職種
  ('industry', NULL, '介護', 'Nursing care', 1),
  ('industry', NULL, '建設', 'Construction', 2),
  ('industry', NULL, '農業', 'Agriculture', 3),
  ('industry', NULL, '飲食料品製造', 'Food and beverage manufacturing', 4),
  ('industry', NULL, '外食', 'Food service', 5),
  ('industry', NULL, '自動車整備', 'Automobile maintenance', 6),
  ('industry', NULL, 'IT', 'IT', 7),
  ('industry', NULL, '漁業', 'Fishery', 8),
  ('industry', NULL, 'ビルクリーニング', 'Building cleaning', 9),
  ('industry', NULL, '宿泊', 'Accommodation', 10),
  ('industry', NULL, '製造', 'Manufacturing', 11),
  ('industry', '建設', 'とび', 'Scaffolding', 1),
  ('industry', '建設', '型枠施工', 'Formwork', 2),
  ('industry', '建設', '鉄筋施工', 'Reinforcing bar', 3),
  ('industry', '建設', '防水施工', 'Waterproofing', 4),
  ('industry', '建設', '内装仕上げ', 'Interior finishing', 5),
  ('industry', '介護', '介護職員', 'Care worker', 1),
  ('industry', '農業', '施設園芸', 'Greenhouse horticulture', 1),
  ('industry', '農業', '畜産', 'Livestock', 2),
  ('industry', 'IT', 'Webエンジニア', 'Web engineer', 1),
  ('industry', 'IT', 'CADオペレーター', 'CAD operator', 2),
  -- 学部 → 学科
  ('faculty', NULL, '工学部', 'Engineering', 1),
  ('faculty', NULL, '経済学部', 'Economics', 2),
  ('faculty', NULL, '経営学部', 'Business', 3),
  ('faculty', NULL, '情報学部', 'Informatics', 4),
  ('faculty', NULL, '法学部', 'Law', 5),
  ('faculty', NULL, '文学部', 'Letters', 6),
  ('faculty', NULL, '国際学部', 'International studies', 7),
  ('faculty', '工学部', '情報工学科', 'Computer engineering', 1),
  ('faculty', '工学部', '建築学科', 'Architecture', 2),
  ('faculty', '経済学部', '経営学科', 'Management', 1);

INSERT INTO selection_options (category, label_ja, label_en, sort_order)
SELECT category, label_ja, label_en, ord FROM _tree WHERE parent IS NULL ORDER BY category, ord;

INSERT INTO selection_options (category, parent_id, label_ja, label_en, sort_order)
SELECT t.category, p.id, t.label_ja, t.label_en, t.ord
FROM _tree t
JOIN selection_options p ON p.category = t.category AND p.parent_id IS NULL AND p.label_ja = t.parent
WHERE t.parent IS NOT NULL
ORDER BY t.category, t.parent, t.ord;

INSERT INTO popular_industries (label_ja, label_en, sort_order) VALUES
  ('介護', 'Nursing care', 1),
  ('建設', 'Construction', 2),
  ('農業', 'Agriculture', 3),
  ('水産加工', 'Seafood processing', 4),
  ('食肉加工', 'Meat processing', 5),
  ('惣菜製造業', 'Prepared food manufacturing', 6),
  ('紡績', 'Spinning', 7),
  ('機械加工', 'Machining', 8),
  ('電子機器組立て', 'Electronics assembly', 9);

-- Change these to the real inboxes.
INSERT INTO site_settings (key, value) VALUES
  ('application_email_individual', 'person@jbbc.co.jp'),
  ('application_email_corporate', 'corporation@jbbc.co.jp');

COMMIT;
