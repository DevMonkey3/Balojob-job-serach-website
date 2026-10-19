-- =============================================================================
-- Sample rows for local testing and demos ONLY. Never run this on production.
--
-- Creates:
--   * 2 admin console accounts (Administrator, and a view-only user)
--   * 7 companies with 10 job postings, 4 schools with 6 recruitments
--   * 6 candidates with languages, education, work history, wishes, family
--   * 4 contact requests in different states
-- Dates are spread over the last two months so the dashboard counts show
-- something for 当日 / 週間 / 今月.
--
-- Admin console logins (http://localhost:3000/admin):
--   Administrator  ログインID: admin@example.com    パスワード: Bhalojob-admin-2026!
--   閲覧のみ        ログインID: viewer@example.com   パスワード: Bhalojob-viewer-2026!
--
-- Member logins (http://localhost:3000/login), all with パスワード: Bhalojob-member-2026!
--   候補者（承認済）         akram@example.com              (application waiting for staff approval)
--   候補者（審査中）         najmul@example.com             (profile waiting in the queue)
--   企業（株式会社〇△□建設）  hr@example-kensetsu.co.jp
--   企業（テックブリッジ）     careers@example-techbridge.jp  (job 2 waiting for staff approval)
--
-- Run with `npm run db:sample` after `npm run db:seed`. Refuses to run twice.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  u uuid;
  admin_id uuid;
  c bigint;
  i bigint;
  j bigint;
  r bigint;
  a bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com') THEN
    RAISE EXCEPTION 'Sample data is already loaded. Nothing was changed.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Staff (password hashes are scrypt, the format src/server/auth/password.ts writes)
  -- ---------------------------------------------------------------------------
  INSERT INTO users (email, email_verified, name, account_type)
  VALUES ('admin@example.com', true, 'テスト管理者', 'staff') RETURNING id INTO u;
  INSERT INTO staff_profiles (user_id, is_admin, can_view, can_edit, can_delete) VALUES (u, true, true, true, true);
  INSERT INTO staff_credentials (user_id, password_hash) VALUES (u, 'scrypt$16384$8$1$xzgVrOr/hiEanq7m5s5rag==$KdO9IaZ1tlPmYCT78xtWSCXt43T2zQAG241wQAW1R5k9+p6U1G54jVMKDI9PhBsRP5CXcCbkt2K1OWyiSB3dnw==');
  admin_id := u;

  INSERT INTO users (email, email_verified, name, account_type)
  VALUES ('viewer@example.com', true, '閲覧担当', 'staff') RETURNING id INTO u;
  INSERT INTO staff_profiles (user_id, is_admin, can_view, can_edit, can_delete) VALUES (u, false, true, false, false);
  INSERT INTO staff_credentials (user_id, password_hash) VALUES (u, 'scrypt$16384$8$1$akN6Qch60kaaEvisB0ncHA==$YkzfI+sChjh7p9ofZn+tVLwa82+6NE7a4HBdxgpH8RlRhvQyOLYGS2Xx9MjBovrQVRu53UvorNGCy8pGF4Gd4A==');

  -- ---------------------------------------------------------------------------
  -- Companies (法人会員: 企業) and their job postings
  -- ---------------------------------------------------------------------------
  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('hr@example-kensetsu.co.jp', true, '株式会社〇△□建設', 'corporate', now() - interval '45 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, name_kana, founded, representative, capital_man_yen, headcount, industry, url,
                            postal_code, prefecture, city, town, address_line, contact_person, phone, contact_email, introduction,
                            is_company, created_at)
  VALUES (u, 'company', '株式会社〇△□建設', 'カブシキガイシャマルサンカクシカクケンセツ', '1985年', '山田 太郎', 3000, 85, '建設',
          'https://example-kensetsu.co.jp', '220-0011', '神奈川県', '横浜市西区', '高島', '2-1-1', '鈴木 一郎', '045-000-0001',
          'hr@example-kensetsu.co.jp', '横浜を拠点に、集合住宅と商業施設の施工を手がけています。外国人技能実習生の受け入れ実績は10年以上。寮完備、日本語学習を支援します。',
          true, now() - interval '45 days') RETURNING id INTO c;
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, work_name, employment_type, description, location,
                            hours_from, hours_to, holidays, monthly_salary, contact_person, contact_email, features, created_at)
  VALUES (c, 1, 'titp', '建設', 'とび', '足場の組立・解体', '正社員', '現場での足場組立・解体作業。経験不問、入社後に研修があります。', '神奈川県横浜市',
          '08:00', '17:30', '日曜・祝日、年末年始、夏季', 190000, '鈴木 一郎', 'hr@example-kensetsu.co.jp', '寮完備・日本語学習支援', now() - interval '40 days')
  RETURNING id INTO j;
  INSERT INTO job_orders (job_posting_id, daily_working_time, overtime_monthly_avg_hours, break_time, avg_work_days_per_month, weekly_work_days,
                          has_employment_insurance, has_workers_comp, has_health_insurance, has_pension, commute_full, japanese_level)
  VALUES (j, '08:00', 15, '12:00〜13:00', 22, '月〜土', true, true, true, true, true, 'N4以上が望ましい');
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, work_name, employment_type, description, location,
                            hours_from, hours_to, holidays, monthly_salary, contact_person, contact_email, features, created_at)
  VALUES (c, 2, 'ssw', '建設', '型枠施工', '型枠の加工・組立', '正社員', '図面に基づく型枠の加工・組立・解体。特定技能1号（建設）対象。', '神奈川県横浜市',
          '08:00', '17:30', '日曜・祝日', 220000, '鈴木 一郎', 'hr@example-kensetsu.co.jp', '資格取得支援あり', now() - interval '20 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('saiyo@example-marubatsu.co.jp', true, '株式会社〇✕建設', 'corporate', now() - interval '38 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, capital_man_yen, headcount, industry, prefecture, city,
                            contact_person, phone, contact_email, is_company, is_registered_support_org, created_at)
  VALUES (u, 'company', '株式会社〇✕建設', '1998年', '佐藤 健', 1000, 42, '建設', '神奈川県', '厚木市', '高橋 美咲', '046-000-0002',
          'saiyo@example-marubatsu.co.jp', true, true, now() - interval '38 days') RETURNING id INTO c;
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, employment_type, location, hours_from, hours_to, monthly_salary, created_at)
  VALUES (c, 1, 'ssw', '建設', '防水施工', '正社員', '神奈川県厚木市', '08:30', '17:30', 220000, now() - interval '30 days');
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, employment_type, location, hours_from, hours_to, monthly_salary, is_active, created_at)
  VALUES (c, 2, 'titp', '建設', '内装仕上げ', '正社員', '神奈川県厚木市', '08:30', '17:30', 185000, false, now() - interval '30 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('info@example-jidosha.co.jp', true, '株式会社△△自動車', 'corporate', now() - interval '25 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, headcount, industry, prefecture, city, phone, contact_email, is_company, created_at)
  VALUES (u, 'company', '株式会社△△自動車', '2005年', '田中 大輔', 28, '自動車整備', '神奈川県', '川崎市', '044-000-0003', 'info@example-jidosha.co.jp', true, now() - interval '25 days')
  RETURNING id INTO c;
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, employment_type, location, hours_from, hours_to, holidays, monthly_salary, created_at)
  VALUES (c, 1, 'ssw', '自動車整備', '自動車整備', '正社員', '神奈川県川崎市', '09:00', '18:00', '水曜・第2火曜', 230000, now() - interval '12 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('recruit@example-sekkei.co.jp', true, '□□設計株式会社', 'corporate', now() - interval '18 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, capital_man_yen, headcount, industry, url, prefecture, city, contact_email, is_company, created_at)
  VALUES (u, 'company', '□□設計株式会社', '2010年', '伊藤 彩', 5000, 60, 'IT', 'https://example-sekkei.co.jp', '東京都', '品川区', 'recruit@example-sekkei.co.jp', true, now() - interval '18 days')
  RETURNING id INTO c;
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, work_name, employment_type, description, location, hours_from, hours_to, monthly_salary, created_at)
  VALUES (c, 1, 'engineer', 'IT', 'CADオペレーター', '建築図面の作成', '正社員', 'AutoCAD / Revit による建築図面の作成。技術・人文知識・国際業務ビザ対象。', '東京都品川区', '09:30', '18:30', 260000, now() - interval '10 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('jinji@example-sakurakai.or.jp', true, '社会福祉法人さくら会', 'corporate', now() - interval '9 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, headcount, industry, prefecture, city, phone, contact_email, is_company, created_at)
  VALUES (u, 'company', '社会福祉法人さくら会', '1992年', '渡辺 久美子', 150, '介護', '千葉県', '船橋市', '047-000-0005', 'jinji@example-sakurakai.or.jp', true, now() - interval '9 days')
  RETURNING id INTO c;
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, employment_type, description, location, hours_from, hours_to, holidays, monthly_salary, features, created_at)
  VALUES (c, 1, 'ssw', '介護', '介護職員', '正社員', '特別養護老人ホームでの介護業務。夜勤は月4回程度。', '千葉県船橋市', '07:00', '16:00', 'シフト制（月9日）', 210000, '介護福祉士の資格取得を全面支援', now() - interval '6 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('contact@example-midori.co.jp', true, '株式会社みどり農園', 'corporate', now() - interval '4 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, headcount, industry, prefecture, city, contact_email, is_company, created_at)
  VALUES (u, 'company', '株式会社みどり農園', '2001年', '小林 誠', 18, '農業', '茨城県', '鉾田市', 'contact@example-midori.co.jp', true, now() - interval '4 days')
  RETURNING id INTO c;
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, employment_type, location, hours_from, hours_to, monthly_salary, created_at)
  VALUES (c, 1, 'titp', '農業', '施設園芸', '正社員', '茨城県鉾田市', '07:30', '16:30', 180000, now() - interval '2 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('careers@example-techbridge.jp', true, '株式会社テックブリッジ', 'corporate', now() - interval '1 day') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, capital_man_yen, headcount, industry, url, prefecture, city, contact_email, is_company, created_at)
  VALUES (u, 'company', '株式会社テックブリッジ', '2018年', '中村 翔', 2000, 35, 'IT', 'https://example-techbridge.jp', '東京都', '渋谷区', 'careers@example-techbridge.jp', true, now() - interval '1 day')
  RETURNING id INTO c;
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, work_name, employment_type, description, location, hours_from, hours_to, monthly_salary, features, created_at)
  VALUES (c, 1, 'engineer', 'IT', 'Webエンジニア', 'Webアプリケーション開発', '正社員', 'TypeScript / React / Node.js を使った受託開発。英語でのコミュニケーション可。', '東京都渋谷区', '10:00', '19:00', 320000, 'リモート勤務可・英語OK', now());
  INSERT INTO job_postings (corporation_id, job_no, track, industry, job_type, employment_type, location, hours_from, hours_to, monthly_salary, created_at)
  VALUES (c, 2, 'engineer', 'IT', 'Webエンジニア', '契約社員', '東京都渋谷区', '10:00', '19:00', 280000, now());

  -- ---------------------------------------------------------------------------
  -- Schools (法人会員: 学校) and their recruitments
  -- ---------------------------------------------------------------------------
  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('admission@example-univ.ac.jp', true, '〇△□大学', 'corporate', now() - interval '50 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, name_kana, founded, representative, headcount, url, prefecture, city, contact_person, contact_email, introduction,
                            is_university, created_at)
  VALUES (u, 'school', '〇△□大学', 'マルサンカクシカクダイガク', '1965年', '佐藤 花子', 4200, 'https://example-univ.ac.jp', '東京都', '八王子市', '国際課 山本',
          'admission@example-univ.ac.jp', '工学・経済・情報の3学部。留学生向けの日本語補習と奨学金制度があります。', true, now() - interval '50 days') RETURNING id INTO c;
  INSERT INTO recruitments (corporation_id, recruitment_no, faculty, department, school_gender, location, capacity, annual_tuition, contact_person, contact_email, notes, created_at)
  VALUES (c, 1, '工学部', '情報工学科', '共学', '東京都八王子市', 120, 1440000, '国際課 山本', 'admission@example-univ.ac.jp', '4月入学。日本語能力N2以上。', now() - interval '48 days');
  INSERT INTO recruitments (corporation_id, recruitment_no, faculty, department, school_gender, location, capacity, annual_tuition, created_at)
  VALUES (c, 2, '経済学部', '経営学科', '共学', '東京都八王子市', 180, 1200000, now() - interval '48 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('info@example-kogaku.ac.jp', true, '△△工学専門学校', 'corporate', now() - interval '30 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, headcount, prefecture, city, contact_email, is_vocational_school, created_at)
  VALUES (u, 'school', '△△工学専門学校', '1988年', '高橋 修', 600, '神奈川県', '横浜市', 'info@example-kogaku.ac.jp', true, now() - interval '30 days') RETURNING id INTO c;
  INSERT INTO recruitments (corporation_id, recruitment_no, faculty, department, school_gender, location, capacity, annual_tuition, created_at)
  VALUES (c, 1, '情報工学部', 'AI学科', '共学', '神奈川県横浜市', 40, 1100000, now() - interval '28 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('nyugaku@example-marubatsu.ac.jp', true, '〇✕専門学校', 'corporate', now() - interval '15 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, headcount, prefecture, city, contact_email, is_vocational_school, created_at)
  VALUES (u, 'school', '〇✕専門学校', '1995年', '松本 良子', 350, '神奈川県', '厚木市', 'nyugaku@example-marubatsu.ac.jp', true, now() - interval '15 days') RETURNING id INTO c;
  INSERT INTO recruitments (corporation_id, recruitment_no, faculty, department, school_gender, location, capacity, annual_tuition, created_at)
  VALUES (c, 1, '工学部', '自動車整備学科', '共学', '神奈川県厚木市', 60, 1000000, now() - interval '14 days');

  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('office@example-nihongo.jp', true, '□□日本語学校', 'corporate', now() - interval '3 days') RETURNING id INTO u;
  INSERT INTO corporations (user_id, kind, name, founded, representative, headcount, prefecture, city, contact_person, contact_email, introduction, is_language_school, created_at)
  VALUES (u, 'school', '□□日本語学校', '2008年', '森 由美', 240, '神奈川県', '横浜市', '事務局', 'office@example-nihongo.jp',
          '進学コース（2年）と就職コース（1年）。バングラデシュ・ベトナム・ネパールからの学生が在籍。', true, now() - interval '3 days') RETURNING id INTO c;
  INSERT INTO recruitments (corporation_id, recruitment_no, faculty, department, school_gender, location, capacity, annual_tuition, notes, created_at)
  VALUES (c, 1, '日本語科', '進学コース', '共学', '神奈川県横浜市', 80, 780000, '4月・10月入学', now() - interval '2 days') RETURNING id INTO r;
  INSERT INTO recruitments (corporation_id, recruitment_no, faculty, department, school_gender, location, capacity, annual_tuition, created_at)
  VALUES (c, 2, '日本語科', '就職コース', '共学', '神奈川県横浜市', 40, 720000, now() - interval '2 days');

  -- ---------------------------------------------------------------------------
  -- Candidates (個人会員)
  -- ---------------------------------------------------------------------------
  -- 1. HOSSAIN AKRAM: wants 特定技能 (建設) and a language school; full profile.
  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('akram@example.com', true, 'HOSSAIN AKRAM', 'individual', now() - interval '35 days') RETURNING id INTO u;
  INSERT INTO individuals (user_id, full_name, name_kana, gender, birth_date, has_spouse, has_children, residence_country, nationality, native_language,
                           mobile, contact_email, postal_code, state, city, street, house_number, introduction,
                           wants_ssw, wants_language_school, created_at)
  VALUES (u, 'HOSSAIN AKRAM', 'ホサイン アクラム', '男性', '2003-08-15', false, false, 'バングラデシュ', 'バングラデシュ', 'ベンガル語',
          '+880-1700-000001', 'akram@example.com', '1212', 'Dhaka', 'Dhaka', 'Mirpur Road', '12/A',
          '建設現場で2年間働きました。日本で技能を学び、将来は自国で建設会社を作りたいです。',
          true, true, now() - interval '35 days') RETURNING id INTO i;
  INSERT INTO individual_languages (individual_id, language, level, sort_order) VALUES
    (i, 'ベンガル語', 'ネイティブ', 0), (i, '英語', 'ビジネス', 1), (i, '日本語', 'N4', 2);
  INSERT INTO individual_educations (individual_id, degree, school_name, enrolled_on, graduated_on, major, sort_order) VALUES
    (i, '高校', 'Dhaka City College', '2018-01-01', '2020-12-01', 'Science', 0);
  INSERT INTO individual_work_experiences (individual_id, company_name, industry, joined_on, left_on, sort_order) VALUES
    (i, 'Rahman Construction Ltd.', '建設', '2021-03-01', '2023-02-01', 0);
  INSERT INTO individual_certifications (individual_id, name, certificate_title, acquired_on, sort_order) VALUES
    (i, '日本語能力試験', 'JLPT N4', '2024-12-01', 0);
  INSERT INTO individual_preferred_areas (individual_id, country, region, prefecture, city, sort_order) VALUES
    (i, '日本', '関東', '神奈川県', '横浜市', 0);
  INSERT INTO individual_job_wishes (individual_id, track, desired_job, desired_salary, years_of_stay, ssw_test, sort_order) VALUES
    (i, 'ssw', '建設', '200,000〜250,000円', 5, 'passed', 0);
  INSERT INTO individual_study_wishes (individual_id, school_category, school_name, notes, sort_order) VALUES
    (i, 'language_school', NULL, '就職前に半年〜1年学びたい', 0);
  INSERT INTO resumes (individual_id, height_cm, weight_kg, blood_type, dominant_hand, smokes, has_tattoo, alcohol, allergies, strengths, weaknesses, motivation, hobbies)
  VALUES (i, 170.5, 64.0, 'A', '右手', false, false, '飲まない', 'なし', '体力があり、チームで働くのが得意です', '日本語の読み書き', '日本の建設技術を学びたい', 'クリケット、料理');
  INSERT INTO family_members (individual_id, relation, full_name, birth_date, address, occupation, sort_order) VALUES
    (i, '父', 'HOSSAIN KAMAL', '1970-02-11', 'Dhaka', '商店経営', 0),
    (i, '母', 'HOSSAIN RUMA', '1975-09-03', 'Dhaka', '主婦', 1);
  -- Contact request to 型枠施工 (job 2 of 株式会社〇△□建設)
  INSERT INTO applications (individual_id, status, created_at) VALUES (i, 'new', now() - interval '1 day') RETURNING id INTO a;
  SELECT jp.id INTO j FROM job_postings jp JOIN corporations co ON co.id = jp.corporation_id WHERE co.name = '株式会社〇△□建設' AND jp.job_no = 2;
  INSERT INTO application_items (application_id, job_posting_id, target_label) VALUES (a, j, '株式会社〇△□建設 / 型枠施工');

  -- 2. KHAN MD ATIQUR RAHMAN: 技能実習 (介護)
  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('atiqur@example.com', true, 'KHAN MD ATIQUR RAHMAN', 'individual', now() - interval '28 days') RETURNING id INTO u;
  INSERT INTO individuals (user_id, full_name, gender, birth_date, has_spouse, has_children, children_count, residence_country, nationality, native_language,
                           mobile, contact_email, visa_status, visa_expiry, wants_titp, created_at)
  VALUES (u, 'KHAN MD ATIQUR RAHMAN', '男性', '1999-02-10', true, true, 1, '日本', 'バングラデシュ', 'ベンガル語',
          '090-0000-0002', 'atiqur@example.com', '留学', '2027-03-01', true, now() - interval '28 days') RETURNING id INTO i;
  INSERT INTO individual_languages (individual_id, language, level, sort_order) VALUES
    (i, 'ベンガル語', 'ネイティブ', 0), (i, '日本語', 'N3', 1);
  INSERT INTO individual_educations (individual_id, degree, school_name, enrolled_on, graduated_on, major, sort_order) VALUES
    (i, '大学', 'University of Chittagong', '2017-01-01', '2021-06-01', 'Sociology', 0),
    (i, '専門学校', '□□日本語学校', '2024-04-01', NULL, '日本語', 1);
  INSERT INTO individual_job_wishes (individual_id, track, desired_job, desired_salary, years_of_stay, sort_order) VALUES
    (i, 'titp', '介護', '180,000〜200,000円', 3, 0);
  INSERT INTO applications (individual_id, status, staff_note, created_at) VALUES (i, 'in_progress', '10/14 本人に電話。面接日を調整中。', now() - interval '5 days') RETURNING id INTO a;
  SELECT jp.id INTO j FROM job_postings jp JOIN corporations co ON co.id = jp.corporation_id WHERE co.name = '社会福祉法人さくら会' AND jp.job_no = 1;
  INSERT INTO application_items (application_id, job_posting_id, target_label) VALUES (a, j, '社会福祉法人さくら会 / 介護職員');

  -- 3. MARY CABALLERO: 技人国 (IT), closed request
  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('mary@example.com', true, 'MARY CABALLERO', 'individual', now() - interval '21 days') RETURNING id INTO u;
  INSERT INTO individuals (user_id, full_name, gender, birth_date, has_spouse, has_children, residence_country, nationality, native_language,
                           mobile, contact_email, introduction, wants_engineer, created_at)
  VALUES (u, 'MARY CABALLERO', '女性', '1997-11-30', false, false, 'フィリピン', 'フィリピン', '英語',
          '+63-900-000-0003', 'mary@example.com', 'Full-stack developer with 4 years of experience in React and Node.js.', true, now() - interval '21 days') RETURNING id INTO i;
  INSERT INTO individual_languages (individual_id, language, level, sort_order) VALUES
    (i, '英語', 'ネイティブ', 0), (i, '日本語', 'N3', 1);
  INSERT INTO individual_educations (individual_id, degree, school_name, enrolled_on, graduated_on, major, sort_order) VALUES
    (i, '大学', 'University of the Philippines', '2015-06-01', '2019-05-01', 'Computer Science', 0);
  INSERT INTO individual_work_experiences (individual_id, company_name, industry, joined_on, left_on, sort_order) VALUES
    (i, 'Manila Software Inc.', 'IT', '2019-07-01', '2023-09-01', 0),
    (i, 'Freelance', 'IT', '2023-10-01', NULL, 1);
  INSERT INTO individual_certifications (individual_id, name, certificate_title, acquired_on, sort_order) VALUES
    (i, '日本語能力試験', 'JLPT N3', '2025-07-01', 0), (i, 'AWS', 'AWS Certified Developer – Associate', '2023-03-01', 1);
  INSERT INTO individual_job_wishes (individual_id, track, desired_job, desired_salary, years_of_stay, notes, sort_order) VALUES
    (i, 'engineer', 'IT', '300,000円〜', 10, 'リモート勤務希望', 0);
  INSERT INTO applications (individual_id, status, staff_note, created_at) VALUES (i, 'closed', '企業へ紹介済み。一次面接通過。', now() - interval '12 days') RETURNING id INTO a;
  SELECT jp.id INTO j FROM job_postings jp JOIN corporations co ON co.id = jp.corporation_id WHERE co.name = '株式会社テックブリッジ' AND jp.job_no = 1;
  INSERT INTO application_items (application_id, job_posting_id, target_label) VALUES (a, j, '株式会社テックブリッジ / Webエンジニア');

  -- 4. NAEM NAJMUL HASAN: 特定技能 (自動車整備)
  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('najmul@example.com', true, 'NAEM NAJMUL HASAN', 'individual', now() - interval '8 days') RETURNING id INTO u;
  INSERT INTO individuals (user_id, full_name, gender, birth_date, residence_country, nationality, native_language, mobile, contact_email, wants_ssw, created_at)
  VALUES (u, 'NAEM NAJMUL HASAN', '男性', '2001-05-22', 'バングラデシュ', 'バングラデシュ', 'ベンガル語', '+880-1700-000004', 'najmul@example.com', true, now() - interval '8 days')
  RETURNING id INTO i;
  INSERT INTO individual_languages (individual_id, language, level, sort_order) VALUES
    (i, 'ベンガル語', 'ネイティブ', 0), (i, '英語', '日常会話', 1), (i, '日本語', 'N5', 2);
  INSERT INTO individual_job_wishes (individual_id, track, desired_job, desired_salary, years_of_stay, ssw_test, sort_order) VALUES
    (i, 'ssw', '自動車整備', '200,000〜250,000円', 5, 'in_progress', 0);

  -- 5. AUNG MYO HTET: wants a Japanese language school
  INSERT INTO users (email, email_verified, name, account_type, created_at)
  VALUES ('aung@example.com', true, 'AUNG MYO HTET', 'individual', now() - interval '3 days') RETURNING id INTO u;
  INSERT INTO individuals (user_id, full_name, gender, birth_date, residence_country, nationality, native_language, contact_email, wants_language_school, wants_vocational, created_at)
  VALUES (u, 'AUNG MYO HTET', '男性', '2000-07-07', 'ミャンマー', 'ミャンマー', 'ビルマ語', 'aung@example.com', true, true, now() - interval '3 days')
  RETURNING id INTO i;
  INSERT INTO individual_languages (individual_id, language, level, sort_order) VALUES (i, '日本語', 'N5', 0), (i, '英語', '初級', 1);
  INSERT INTO individual_study_wishes (individual_id, school_category, school_name, faculty, department, sort_order) VALUES
    (i, 'language_school', '□□日本語学校', '日本語科', '進学コース', 0),
    (i, 'vocational', NULL, '情報工学部', 'AI学科', 1);
  INSERT INTO applications (individual_id, status, created_at) VALUES (i, 'new', now()) RETURNING id INTO a;
  INSERT INTO application_items (application_id, recruitment_id, target_label) VALUES (a, r, '□□日本語学校 / 日本語科 進学コース');

  -- 6. NGUYEN THI HOA: registered today, inactive (withdrew)
  INSERT INTO users (email, email_verified, name, account_type)
  VALUES ('hoa@example.com', false, 'NGUYEN THI HOA', 'individual') RETURNING id INTO u;
  INSERT INTO individuals (user_id, full_name, gender, birth_date, residence_country, nationality, native_language, contact_email, wants_university, is_active)
  VALUES (u, 'NGUYEN THI HOA', '女性', '2002-03-18', 'ベトナム', 'ベトナム', 'ベトナム語', 'hoa@example.com', true, false) RETURNING id INTO i;
  INSERT INTO individual_study_wishes (individual_id, school_category, university_level, faculty, sort_order) VALUES (i, 'university', 'undergraduate', '経済学部', 0);
  -- ---------------------------------------------------------------------------
  -- Member logins for the demo (one shared password, see the header)
  -- ---------------------------------------------------------------------------
  INSERT INTO member_credentials (user_id, password_hash)
  SELECT id, 'scrypt$16384$8$1$EYDk7D0+lInzKXMIIQH/6g==$0fLEyicU3BjRbM3Ryd9kmFsCvVzTPfaNzbSLa3K7+k/3zA0ECzROj0TDKbOEX9DL2MJ3rKkoBITGiyGYH1kn3w==' FROM users
  WHERE email IN ('akram@example.com', 'najmul@example.com', 'hr@example-kensetsu.co.jp', 'careers@example-techbridge.jp');

  -- ---------------------------------------------------------------------------
  -- 審査: staff-entered data counts as approved; a few rows wait in the queues
  -- ---------------------------------------------------------------------------
  UPDATE job_postings SET review_status = 'approved', submitted_at = created_at, reviewed_at = created_at, reviewed_by = admin_id;
  UPDATE individuals  SET review_status = 'approved', submitted_at = created_at, reviewed_at = created_at, reviewed_by = admin_id;
  UPDATE applications SET review_status = 'approved', submitted_at = created_at, reviewed_at = created_at, reviewed_by = admin_id;
  UPDATE applications a SET job_posting_id = ai.job_posting_id
    FROM application_items ai WHERE ai.application_id = a.id AND ai.job_posting_id IS NOT NULL;
  -- テックブリッジ's second job waits for approval
  UPDATE job_postings jp SET review_status = 'pending', reviewed_at = NULL, reviewed_by = NULL, submitted_at = now()
    FROM corporations co WHERE co.id = jp.corporation_id AND co.name = '株式会社テックブリッジ' AND jp.job_no = 2;
  -- NAJMUL submitted his profile yesterday; HOA never submitted hers
  UPDATE individuals SET review_status = 'pending', reviewed_at = NULL, reviewed_by = NULL, submitted_at = now() - interval '1 day'
    WHERE full_name = 'NAEM NAJMUL HASAN';
  UPDATE individuals SET review_status = 'pending', reviewed_at = NULL, reviewed_by = NULL, submitted_at = NULL
    WHERE full_name = 'NGUYEN THI HOA';
  -- AKRAM's and AUNG's applications wait for approval
  UPDATE applications a SET review_status = 'pending', reviewed_at = NULL, reviewed_by = NULL, submitted_at = a.created_at
    FROM individuals i WHERE i.id = a.individual_id AND i.full_name IN ('HOSSAIN AKRAM', 'AUNG MYO HTET');
END;
$$;

COMMIT;
