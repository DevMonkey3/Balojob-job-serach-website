# Bhalojob: every table, column and relationship

Generated from the first migration (`prisma/migrations/0_init/migration.sql`, formerly `db/schema.sql`) after running it on PostgreSQL 18, so it matches the SQL exactly. It covers `0_init` only; later changes are in the newer folders under `prisma/migrations/` and in `prisma/schema.prisma`.

> **Use this as a reference, not as typing instructions.** The app is now connected through Prisma, which creates the tables with `npm run db:deploy` (see [database-guide.md](database-guide.md)). Tables typed by hand in pgAdmin would be missing from Prisma's migration history. The pgAdmin field order below is kept so the columns are easy to compare with what pgAdmin shows.

**Create things in this order:** ① enum types → ② sequences → ③ tables 1–22 in the order below (a table must exist before another table can point at it) → ④ the updated_at trigger (last section).

**How the columns table maps to pgAdmin** (Create → Table → **Columns** tab, click **+** for each row):

| This document | pgAdmin field |
|---|---|
| Column | Name |
| Data type | Data type (start typing to filter the list) |
| Length | Length/Precision |
| Scale | Scale |
| Not NULL | Not NULL? switch |
| PK | Primary key? switch |
| Default | Click the ✏️ edit icon at the start of the row → **Constraints** tab → Default |

※1 **IDENTITY columns** (auto-numbered `id`): edit icon → **Constraints** tab → Type: **IDENTITY**, Identity: **ALWAYS**. Leave Default empty.

Relationships, unique rules and checks go in the **Constraints** tab of the same dialog. Indexes are created afterwards: open the table → right-click **Indexes → Create → Index…**

**Check your typing when you finish.** Create a second database `balojob_check` (owner `balojob`), run `prisma/migrations/0_init/migration.sql` in it, then use **Tools → Schema Diff**: source = `balojob_check`, target = `balojob`, click **Compare**. pgAdmin lists every table, column or rule you typed differently, and can generate the SQL to fix it.

## ① Enum types

For each: right-click **Types → Create → Type…** → General: Name → **Definition** tab: Type = **Enumeration**, then add each label with **+** in this order.

| Type name | Labels (in order) |
|---|---|
| `account_type` | `individual`, `corporate`, `staff` |
| `corporation_kind` | `company`, `school` |
| `job_track` | `engineer`, `ssw`, `titp` |
| `school_category` | `university`, `vocational`, `language_school` |
| `university_level` | `undergraduate`, `graduate` |
| `ssw_test_status` | `passed`, `in_progress`, `not_taken` |
| `application_status` | `new`, `in_progress`, `closed` |

## ② Sequences (member numbers)

Right-click **Sequences → Create → Sequence…**, enter only the Name, Save. Leave everything else as default.

| Sequence | Used by |
|---|---|
| `individual_member_seq` | `individuals.member_no` → 10yymm000001 |
| `corporate_member_seq` | `corporations.member_no` → 20yymm000001 |

## ③ Tables

### 1. `users` — ログイン

One row per login: individual, corporate or staff. Replaces ログインマスタ + ユーザマスタ.

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | uuid |  |  | ✔ | ✔ | `gen_random_uuid()` | ID（自動採番） |
| 2 | `email` | character varying | 254 |  | ✔ |  |  | メールアドレス（ログインID） |
| 3 | `email_verified` | boolean |  |  | ✔ |  | `false` | メール認証済み |
| 4 | `name` | character varying | 80 |  |  |  |  | 氏名・表示名 |
| 5 | `account_type` | account_type |  |  | ✔ |  |  | 個人 / 法人 / 管理者 |
| 6 | `is_active` | boolean |  |  | ✔ |  | `true` | 有効（false = 非アクティブ） |
| 7 | `last_login_at` | timestamp with time zone |  |  |  |  |  | 最終ログイン日時 |
| 8 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 9 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Unique** (Constraints tab → **Unique** → **+** → Columns)

- `users_email_key`: `email`

### 2. `staff_profiles` — 管理ユーザ権限

Admin console permissions. Only for users with account_type = staff.

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `user_id` | uuid |  |  | ✔ | ✔ |  | ログインID → users |
| 2 | `is_admin` | boolean |  |  | ✔ |  | `false` | Administrator |
| 3 | `can_view` | boolean |  |  | ✔ |  | `true` | 参照権限 |
| 4 | `can_edit` | boolean |  |  | ✔ |  | `false` | 更新権限 |
| 5 | `can_delete` | boolean |  |  | ✔ |  | `false` | 削除権限 |
| 6 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 7 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `staff_profiles_user_id_fkey` | `user_id` | `users` | `id` | **CASCADE** |

### 3. `individuals` — 個人会員情報

Candidate profile (BHALO010–019, 210).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `user_id` | uuid |  |  | ✔ |  |  | ログインID → users |
| 3 | `member_no` | character | 12 |  | ✔ |  | `'10' \|\| to_char(now(), 'YYMM') \|\| lpad(nextval('individual_member_seq')::text, 6, '0')` | 会員番号 10yymm000001（自動） |
| 4 | `full_name` | character varying | 80 |  | ✔ |  |  | 氏名 |
| 5 | `name_kana` | character varying | 120 |  |  |  |  | フリガナ（新規） |
| 6 | `gender` | character varying | 20 |  |  |  |  | 性別 |
| 7 | `birth_date` | date |  |  |  |  |  | 生年月日 |
| 8 | `has_spouse` | boolean |  |  |  |  |  | 配偶者有無 |
| 9 | `has_children` | boolean |  |  |  |  |  | 子供有無 |
| 10 | `children_count` | smallint |  |  |  |  |  | 子供人数 |
| 11 | `residence_country` | character varying | 80 |  |  |  |  | 居住国 |
| 12 | `nationality` | character varying | 80 |  |  |  |  | 国籍 |
| 13 | `native_language` | character varying | 80 |  |  |  |  | 母国語 |
| 14 | `mobile` | character varying | 20 |  |  |  |  | 携帯番号 |
| 15 | `contact_email` | character varying | 254 |  |  |  |  | メールアドレス |
| 16 | `postal_code` | character varying | 20 |  |  |  |  | 郵便番号 |
| 17 | `state` | character varying | 50 |  |  |  |  | 州地区 |
| 18 | `city` | character varying | 50 |  |  |  |  | 市 |
| 19 | `street` | character varying | 50 |  |  |  |  | 町ロード |
| 20 | `house_number` | character varying | 20 |  |  |  |  | 番地 |
| 21 | `photo_key` | character varying | 300 |  |  |  |  | 写真（ファイルの保存先） |
| 22 | `visa_status` | character varying | 40 |  |  |  |  | VISAステータス |
| 23 | `visa_expiry` | date |  |  |  |  |  | VISA有効期限（月の1日） |
| 24 | `introduction` | text |  |  |  |  |  | 自己紹介（4000字まで） |
| 25 | `appeal_video_key` | character varying | 300 |  |  |  |  | アピール動画（ファイルの保存先） |
| 26 | `wants_engineer` | boolean |  |  | ✔ |  | `false` | 技人国希望 |
| 27 | `wants_ssw` | boolean |  |  | ✔ |  | `false` | 特定技能希望 |
| 28 | `wants_titp` | boolean |  |  | ✔ |  | `false` | 技能実習希望 |
| 29 | `wants_university` | boolean |  |  | ✔ |  | `false` | 大学・大学院希望 |
| 30 | `wants_vocational` | boolean |  |  | ✔ |  | `false` | 専門学校希望 |
| 31 | `wants_language_school` | boolean |  |  | ✔ |  | `false` | 日本語学校希望 |
| 32 | `is_active` | boolean |  |  | ✔ |  | `true` | 有効（false = 非アクティブ） |
| 33 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 34 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `individuals_user_id_fkey` | `user_id` | `users` | `id` | **CASCADE** |

**Unique** (Constraints tab → **Unique** → **+** → Columns)

- `individuals_member_no_key`: `member_no`
- `individuals_user_id_key`: `user_id`

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `individuals_children_count_check` | `((children_count >= 0))` |
| `individuals_introduction_check` | `((char_length(introduction) <= 4000))` |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `individuals_created_at_idx` | `created_at DESC` |  |

### 4. `individual_languages` — 言語

Languages and levels (BHALO014).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `language` | character varying | 30 |  | ✔ |  |  | 言語 |
| 4 | `level` | character varying | 20 |  |  |  |  | レベル |
| 5 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `individual_languages_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `individual_languages_individual_id_idx` | `individual_id` |  |

### 5. `individual_educations` — 学歴

Education history (BHALO015).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `degree` | character varying | 80 |  |  |  |  | 学位 |
| 4 | `school_name` | character varying | 120 |  |  |  |  | 学校名 |
| 5 | `enrolled_on` | date |  |  |  |  |  | 入学年月 |
| 6 | `graduated_on` | date |  |  |  |  |  | 卒業年月 |
| 7 | `passed_on` | date |  |  |  |  |  | パス年月 |
| 8 | `major` | character varying | 80 |  |  |  |  | 専攻科目 |
| 9 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `individual_educations_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `individual_educations_individual_id_idx` | `individual_id` |  |

### 6. `individual_work_experiences` — 実務経験

Work history (BHALO016).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `company_name` | character varying | 80 |  |  |  |  | 会社名 |
| 4 | `industry` | character varying | 120 |  |  |  |  | 業種・職種 |
| 5 | `joined_on` | date |  |  |  |  |  | 入社年月 |
| 6 | `left_on` | date |  |  |  |  |  | 退職年月 |
| 7 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `individual_work_experiences_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `individual_work_experiences_check` | `(((left_on IS NULL) OR (joined_on IS NULL) OR (left_on >= joined_on)))` |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `individual_work_experiences_individual_id_idx` | `individual_id` |  |

### 7. `individual_certifications` — 認定資格

Certifications (BHALO017).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `name` | character varying | 120 |  | ✔ |  |  | 資格名 |
| 4 | `certificate_title` | character varying | 120 |  |  |  |  | 証明書タイトル |
| 5 | `acquired_on` | date |  |  |  |  |  | 取得年月 |
| 6 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `individual_certifications_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `individual_certifications_individual_id_idx` | `individual_id` |  |

### 8. `individual_preferred_areas` — 希望地域

Preferred countries / regions (BHALO020).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `country` | character varying | 120 |  |  |  |  | 国 |
| 4 | `region` | character varying | 120 |  |  |  |  | 地方 |
| 5 | `prefecture` | character varying | 120 |  |  |  |  | 県 |
| 6 | `city` | character varying | 120 |  |  |  |  | 市区郡 |
| 7 | `free_text` | character varying | 300 |  |  |  |  | フリー記載 |
| 8 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `individual_preferred_areas_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `individual_preferred_areas_individual_id_idx` | `individual_id` |  |

### 9. `individual_job_wishes` — 技人国・特定技能・技能実習 希望

Job wishes. One table for all three tracks (BHALO021–023).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `track` | job_track |  |  | ✔ |  |  | engineer=技人国 / ssw=特定技能 / titp=技能実習 |
| 4 | `desired_job` | character varying | 120 |  |  |  |  | 希望職種 |
| 5 | `desired_salary` | character varying | 80 |  |  |  |  | 希望給与 |
| 6 | `years_of_stay` | smallint |  |  |  |  |  | 在留希望年数 |
| 7 | `ssw_test` | ssw_test_status |  |  |  |  |  | 特定技能試験（特定技能のみ） |
| 8 | `notes` | character varying | 300 |  |  |  |  | 特記事項 |
| 9 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `individual_job_wishes_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `individual_job_wishes_check` | `(((ssw_test IS NULL) OR (track = 'ssw'::job_track)))` |
| `individual_job_wishes_years_of_stay_check` | `(((years_of_stay >= 0) AND (years_of_stay <= 99)))` |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `individual_job_wishes_individual_id_idx` | `individual_id` |  |

### 10. `individual_study_wishes` — 大学・専門学校・日本語学校 希望

Study wishes. One table for all three school types (BHALO024–026).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `school_category` | school_category |  |  | ✔ |  |  | university / vocational / language_school |
| 4 | `university_level` | university_level |  |  |  |  |  | 大学 / 大学院（university のみ） |
| 5 | `school_name` | character varying | 120 |  |  |  |  | 希望学校名 |
| 6 | `faculty` | character varying | 120 |  |  |  |  | 希望学部 |
| 7 | `department` | character varying | 120 |  |  |  |  | 希望学科 |
| 8 | `notes` | character varying | 300 |  |  |  |  | 特記事項 |
| 9 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `individual_study_wishes_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `individual_study_wishes_check` | `(((university_level IS NULL) OR (school_category = 'university'::school_category)))` |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `individual_study_wishes_individual_id_idx` | `individual_id` |  |

### 11. `resumes` — 履歴書情報

Extra resume fields. One per individual (BHALO201).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `individual_id` | bigint |  |  | ✔ | ✔ |  | 個人会員 → individuals |
| 2 | `height_cm` | numeric | 4 | 1 |  |  |  | 身長 cm |
| 3 | `weight_kg` | numeric | 4 | 1 |  |  |  | 体重 kg |
| 4 | `blood_type` | character varying | 8 |  |  |  |  | 血液型 |
| 5 | `dominant_hand` | character varying | 10 |  |  |  |  | 利き手 |
| 6 | `eyesight_right` | numeric | 3 | 1 |  |  |  | 視力（右） |
| 7 | `eyesight_left` | numeric | 3 | 1 |  |  |  | 視力（左） |
| 8 | `smokes` | boolean |  |  |  |  |  | 喫煙 |
| 9 | `has_tattoo` | boolean |  |  |  |  |  | 刺青 |
| 10 | `tattoo_location` | character varying | 50 |  |  |  |  | 刺青場所 |
| 11 | `passport_no` | character varying | 100 |  |  |  |  | パスポート番号（アプリで暗号化） |
| 12 | `alcohol` | character varying | 60 |  |  |  |  | お酒 |
| 13 | `allergies` | character varying | 60 |  |  |  |  | アレルギー |
| 14 | `religion` | character varying | 80 |  |  |  |  | 宗教（要配慮個人情報） |
| 15 | `strengths` | character varying | 200 |  |  |  |  | 長所 |
| 16 | `weaknesses` | character varying | 200 |  |  |  |  | 短所 |
| 17 | `motivation` | character varying | 300 |  |  |  |  | 志望動機 |
| 18 | `hobbies` | character varying | 200 |  |  |  |  | 趣味/特技 |
| 19 | `other_notes` | character varying | 300 |  |  |  |  | その他 |
| 20 | `sensitive_consent_at` | timestamp with time zone |  |  |  |  |  | 要配慮個人情報の同意日時（新規） |
| 21 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 22 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `resumes_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `resumes_height_cm_check` | `((height_cm > (0)::numeric))` |
| `resumes_weight_kg_check` | `((weight_kg > (0)::numeric))` |

### 12. `family_members` — 家族構成

Family members (BHALO202).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `relation` | character varying | 50 |  |  |  |  | 関係 |
| 4 | `full_name` | character varying | 80 |  |  |  |  | 氏名 |
| 5 | `birth_date` | date |  |  |  |  |  | 生年月日 |
| 6 | `address` | character varying | 120 |  |  |  |  | 現住所 |
| 7 | `occupation` | character varying | 80 |  |  |  |  | 職業 |
| 8 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `family_members_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `family_members_individual_id_idx` | `individual_id` |  |

### 13. `corporations` — 法人会員情報

Company or school profile (BHALO110–154).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `user_id` | uuid |  |  | ✔ |  |  | ログインID → users |
| 3 | `member_no` | character | 12 |  | ✔ |  | `'20' \|\| to_char(now(), 'YYMM') \|\| lpad(nextval('corporate_member_seq')::text, 6, '0')` | 法人会員番号 20yymm000001（自動） |
| 4 | `kind` | corporation_kind |  |  | ✔ |  |  | company=企業 / school=学校 |
| 5 | `name` | character varying | 120 |  | ✔ |  |  | 法人名・学校名 |
| 6 | `name_kana` | character varying | 120 |  |  |  |  | フリガナ |
| 7 | `founded` | character varying | 50 |  |  |  |  | 創業・創立 |
| 8 | `representative` | character varying | 80 |  | ✔ |  |  | 代表者 |
| 9 | `capital_man_yen` | integer |  |  |  |  |  | 資本金（万円） |
| 10 | `headcount` | integer |  |  |  |  |  | 従業員数・生徒数 |
| 11 | `industry` | character varying | 120 |  |  |  |  | 業種 |
| 12 | `url` | character varying | 200 |  |  |  |  | URL |
| 13 | `postal_code` | character varying | 20 |  |  |  |  | 郵便番号 |
| 14 | `prefecture` | character varying | 50 |  |  |  |  | 県 |
| 15 | `city` | character varying | 50 |  |  |  |  | 市区郡 |
| 16 | `town` | character varying | 50 |  |  |  |  | 町 |
| 17 | `address_line` | character varying | 50 |  |  |  |  | 番地 |
| 18 | `contact_person` | character varying | 80 |  |  |  |  | 担当者 |
| 19 | `phone` | character varying | 20 |  |  |  |  | 電話番号 |
| 20 | `contact_email` | character varying | 254 |  |  |  |  | メールアドレス |
| 21 | `logo_key` | character varying | 300 |  |  |  |  | ロゴ（ファイルの保存先） |
| 22 | `introduction` | text |  |  |  |  |  | 自社アピール・紹介文 |
| 23 | `is_company` | boolean |  |  | ✔ |  | `false` | 企業 |
| 24 | `is_supervising_org` | boolean |  |  | ✔ |  | `false` | 監理団体 |
| 25 | `is_registered_support_org` | boolean |  |  | ✔ |  | `false` | 登録支援機関 |
| 26 | `is_university` | boolean |  |  | ✔ |  | `false` | 大学・大学院 |
| 27 | `is_vocational_school` | boolean |  |  | ✔ |  | `false` | 専門学校 |
| 28 | `is_language_school` | boolean |  |  | ✔ |  | `false` | 日本語学校 |
| 29 | `is_active` | boolean |  |  | ✔ |  | `true` | 有効（false = 非アクティブ） |
| 30 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 31 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `corporations_user_id_fkey` | `user_id` | `users` | `id` | **CASCADE** |

**Unique** (Constraints tab → **Unique** → **+** → Columns)

- `corporations_member_no_key`: `member_no`
- `corporations_user_id_key`: `user_id`

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `corporations_capital_man_yen_check` | `((capital_man_yen >= 0))` |
| `corporations_check` | `((is_company OR is_supervising_org OR is_registered_support_org OR is_university OR is_vocational_school OR is_language_school))` |
| `corporations_headcount_check` | `((headcount >= 0))` |
| `corporations_introduction_check` | `((char_length(introduction) <= 4000))` |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `corporations_kind_created_at_idx` | `kind, created_at DESC` |  |

### 14. `job_postings` — 求人情報

Job postings (BHALO115–116).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `corporation_id` | bigint |  |  | ✔ |  |  | 法人会員 → corporations |
| 3 | `job_no` | integer |  |  | ✔ |  |  | 求人番号（会社内の連番） |
| 4 | `track` | job_track |  |  | ✔ |  |  | 種別 engineer / ssw / titp |
| 5 | `industry` | character varying | 120 |  |  |  |  | 業種 |
| 6 | `job_type` | character varying | 120 |  |  |  |  | 職種 |
| 7 | `work_name` | character varying | 120 |  |  |  |  | 作業名 |
| 8 | `employment_type` | character varying | 120 |  |  |  |  | 雇用形態 |
| 9 | `description` | character varying | 1000 |  |  |  |  | 業務内容 |
| 10 | `location` | character varying | 120 |  |  |  |  | 勤務地 |
| 11 | `hours_from` | time without time zone |  |  |  |  |  | 勤務時間 From |
| 12 | `hours_to` | time without time zone |  |  |  |  |  | 勤務時間 To |
| 13 | `holidays` | character varying | 120 |  |  |  |  | 休日 |
| 14 | `monthly_salary` | integer |  |  |  |  |  | 給与（円/月） |
| 15 | `contact_person` | character varying | 80 |  |  |  |  | 担当者 |
| 16 | `contact_email` | character varying | 254 |  |  |  |  | メールアドレス |
| 17 | `features` | character varying | 1000 |  |  |  |  | 会社の特長 |
| 18 | `is_active` | boolean |  |  | ✔ |  | `true` | 有効（false = 非アクティブ） |
| 19 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 20 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `job_postings_corporation_id_fkey` | `corporation_id` | `corporations` | `id` | **CASCADE** |

**Unique** (Constraints tab → **Unique** → **+** → Columns)

- `job_postings_corporation_id_job_no_key`: `corporation_id, job_no`

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `job_postings_monthly_salary_check` | `((monthly_salary >= 0))` |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `job_postings_track_industry_idx` | `track, industry` | `is_active` |

### 15. `job_orders` — 求人票

Job order details. One per job posting (BHALO117).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `job_posting_id` | bigint |  |  | ✔ | ✔ |  | 求人 → job_postings |
| 2 | `daily_working_time` | time without time zone |  |  |  |  |  | 1日の労働時間 |
| 3 | `overtime_daily_hours` | smallint |  |  |  |  |  | 時間外 1日 |
| 4 | `overtime_monthly_avg_hours` | smallint |  |  |  |  |  | 時間外 月平均 |
| 5 | `break_time` | character varying | 120 |  |  |  |  | 休憩時間 |
| 6 | `avg_work_days_per_month` | smallint |  |  |  |  |  | 平均労働日数（月） |
| 7 | `annual_work_hours` | smallint |  |  |  |  |  | 平均労働時間（年） |
| 8 | `weekly_work_days` | character varying | 120 |  |  |  |  | 週勤務日 |
| 9 | `has_employment_insurance` | boolean |  |  | ✔ |  | `false` | 雇用保険 |
| 10 | `has_workers_comp` | boolean |  |  | ✔ |  | `false` | 労災保険 |
| 11 | `has_health_insurance` | boolean |  |  | ✔ |  | `false` | 健康保険 |
| 12 | `has_pension` | boolean |  |  | ✔ |  | `false` | 厚生年金 |
| 13 | `commute_full` | boolean |  |  | ✔ |  | `false` | 通勤手当 全額支給 |
| 14 | `commute_fixed` | boolean |  |  | ✔ |  | `false` | 通勤手当 一律 |
| 15 | `japanese_level` | character varying | 120 |  |  |  |  | 日本語力 |
| 16 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 17 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `job_orders_job_posting_id_fkey` | `job_posting_id` | `job_postings` | `id` | **CASCADE** |

### 16. `recruitments` — 生徒募集情報

Student recruitment per faculty / department (BHALO155–156).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `corporation_id` | bigint |  |  | ✔ |  |  | 法人会員 → corporations |
| 3 | `recruitment_no` | integer |  |  | ✔ |  |  | 生徒募集番号（学校内の連番） |
| 4 | `faculty` | character varying | 120 |  |  |  |  | 学部 |
| 5 | `department` | character varying | 120 |  |  |  |  | 学科 |
| 6 | `school_gender` | character varying | 20 |  |  |  |  | 学校種類（共学 / 男子校 / 女子校） |
| 7 | `location` | character varying | 120 |  |  |  |  | 所在地 |
| 8 | `capacity` | integer |  |  |  |  |  | 募集人数 |
| 9 | `annual_tuition` | integer |  |  |  |  |  | 学費（円/年） |
| 10 | `contact_person` | character varying | 80 |  |  |  |  | 担当者 |
| 11 | `contact_email` | character varying | 254 |  |  |  |  | メールアドレス |
| 12 | `notes` | character varying | 300 |  |  |  |  | 特記事項 |
| 13 | `is_active` | boolean |  |  | ✔ |  | `true` | 有効（false = 非アクティブ） |
| 14 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 15 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `recruitments_corporation_id_fkey` | `corporation_id` | `corporations` | `id` | **CASCADE** |

**Unique** (Constraints tab → **Unique** → **+** → Columns)

- `recruitments_corporation_id_recruitment_no_key`: `corporation_id, recruitment_no`

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `recruitments_annual_tuition_check` | `((annual_tuition >= 0))` |
| `recruitments_capacity_check` | `((capacity >= 0))` |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `recruitments_corporation_id_idx` | `corporation_id` | `is_active` |

### 17. `applications` — コンタクト申込

A contact request from a candidate (BHALO200). New table.

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `individual_id` | bigint |  |  | ✔ |  |  | 個人会員 → individuals |
| 3 | `status` | application_status |  |  | ✔ |  | `'new'` | new / in_progress / closed |
| 4 | `staff_note` | text |  |  |  |  |  | 担当者メモ |
| 5 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |
| 6 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `applications_individual_id_fkey` | `individual_id` | `individuals` | `id` | **CASCADE** |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `applications_individual_id_idx` | `individual_id` |  |
| `applications_status_created_at_idx` | `status, created_at DESC` |  |

### 18. `application_items` — コンタクト申込 明細

Which jobs / schools a request was for. New table.

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `application_id` | bigint |  |  | ✔ |  |  | 申込 → applications |
| 3 | `job_posting_id` | bigint |  |  |  |  |  | 求人 → job_postings |
| 4 | `recruitment_id` | bigint |  |  |  |  |  | 生徒募集 → recruitments |
| 5 | `target_label` | character varying | 300 |  | ✔ |  |  | 申込先の名前（控え） |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `application_items_application_id_fkey` | `application_id` | `applications` | `id` | **CASCADE** |
| `application_items_job_posting_id_fkey` | `job_posting_id` | `job_postings` | `id` | **SET NULL** |
| `application_items_recruitment_id_fkey` | `recruitment_id` | `recruitments` | `id` | **SET NULL** |

**Check** (Constraints tab → **Check** → **+** → paste the expression into *Check*)

| Name | Check |
|---|---|
| `application_items_check` | `((num_nonnulls(job_posting_id, recruitment_id) <= 1))` |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `application_items_application_id_idx` | `application_id` |  |
| `application_items_job_posting_id_idx` | `job_posting_id` |  |
| `application_items_recruitment_id_idx` | `recruitment_id` |  |

### 19. `selection_options` — 選択項目マスタ

Dropdown values. Two levels via parent_id (BHALO812).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `category` | character varying | 40 |  | ✔ |  |  | 区分（industry, visa, country …） |
| 3 | `parent_id` | bigint |  |  |  |  |  | 親項目 → selection_options |
| 4 | `label_ja` | character varying | 120 |  | ✔ |  |  | 日本語名 |
| 5 | `label_en` | character varying | 120 |  |  |  |  | 英語名 |
| 6 | `label_bn` | character varying | 120 |  |  |  |  | ベンガル語名 |
| 7 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |
| 8 | `is_active` | boolean |  |  | ✔ |  | `true` | 有効（false = 非アクティブ） |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `selection_options_parent_id_fkey` | `parent_id` | `selection_options` | `id` | **CASCADE** |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `selection_options_category_parent_id_sort_order_idx` | `category, parent_id, sort_order` |  |

### 20. `popular_industries` — 人気業種

人気の業種 list (BHALO815).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `label_ja` | character varying | 60 |  | ✔ |  |  | 日本語名 |
| 3 | `label_en` | character varying | 120 |  |  |  |  | 英語名 |
| 4 | `sort_order` | smallint |  |  | ✔ |  | `0` | 表示順 |

### 21. `site_settings` — 管理マスタ

Key/value settings, e.g. where contact requests are emailed (BHALO816).

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `key` | character varying | 80 |  | ✔ | ✔ |  | 設定名 |
| 2 | `value` | text |  |  | ✔ |  |  | 値 |
| 3 | `updated_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 最終更新日時 |

### 22. `audit_logs` — 操作ログ

Which staff member viewed or changed which record. New table.

| # | Column | Data type | Length | Scale | Not NULL | PK | Default | 日本語 / note |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | bigint |  |  | ✔ | ✔ | IDENTITY · ALWAYS ※1 | ID（自動採番） |
| 2 | `staff_user_id` | uuid |  |  |  |  |  | 操作した管理者 → users |
| 3 | `action` | character varying | 40 |  | ✔ |  |  | view / create / update / delete |
| 4 | `target_table` | character varying | 60 |  | ✔ |  |  | 対象テーブル |
| 5 | `target_id` | character varying | 40 |  | ✔ |  |  | 対象ID |
| 6 | `details` | jsonb |  |  |  |  |  | 詳細（JSON） |
| 7 | `created_at` | timestamp with time zone |  |  | ✔ |  | `now()` | 登録日時 |

**Foreign keys** (Constraints tab → **Foreign Key** → **+**, then the edit icon: *Columns* tab = local column + References + Referencing, *Action* tab = On delete)

| Name | Local column | References | Referencing | On delete |
|---|---|---|---|---|
| `audit_logs_staff_user_id_fkey` | `staff_user_id` | `users` | `id` | **SET NULL** |

**Indexes** (after saving the table: Indexes → Create → Index…)

| Name | Columns | Condition (*Definition* tab → Constraint) |
|---|---|---|
| `audit_logs_target_table_target_id_idx` | `target_table, target_id` |  |

## ④ Automatic `updated_at` (optional, paste into Query Tool)

Typing triggers in the pgAdmin screens is slow and easy to get wrong. Paste this into **Tools → Query Tool** and press **F5** instead. It makes `updated_at` change by itself whenever a row is edited.

```sql
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'staff_profiles', 'individuals', 'resumes', 'corporations',
    'job_postings', 'job_orders', 'recruitments', 'applications', 'site_settings'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t || '_set_updated_at', t);
  END LOOP;
END;
$$;
```
