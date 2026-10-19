# Admin console (管理画面, BHALO800–816)

The staff console lives under `/admin`. It reads and writes the PostgreSQL database directly, so it is the first place to test that every table works.

## Signing in

1. Open http://localhost:3000/admin (or port 3100 with `npm run dev -- -p 3100`).
2. **Fresh database with no staff account:** the login page shows 初期管理者の作成. Enter a name, email and password (8+ characters). That account becomes the first Administrator.
3. **After `npm run db:sample`:** a test Administrator already exists. Its login ID and password are at the top of `db/sample-data.sql`. Local use only.

Sessions last 7 days and are stored in `staff_sessions`; the browser only holds a random token (cookie `bj_admin`, path `/admin`). Passwords are hashed with scrypt in `staff_credentials` and are never shown anywhere, including BHALO811/813 where the spec displayed them.

Ten wrong passwords for one login ID lock it for 15 minutes (per server process; on AWS this moves to ElastiCache).

## Permissions (ユーザマスタ)

Each staff user has four flags, set on BHALO811:

| Flag | Lets the user |
|---|---|
| 参照権限 canView | open the list screens |
| 更新権限 canEdit | open add/edit screens and save |
| 削除権限 canDelete | see and use [削除] |
| Administrator isAdmin | everything above, plus ユーザ (810/811) and マスタ (812–816) |

A missing permission sends the user back to the dashboard with a message, as the spec asks. Checks run on the server in every page and every action (`requireStaff` / `requireStaffForAction` in `src/server/auth/staff.ts`), never only in the menu.

## Screens

| URL | Screen | Spec |
|---|---|---|
| `/admin/login` | Staff login / first-admin setup | — |
| `/admin` | Dashboard: counts for 当日/週間/今月, active totals, latest members and jobs | BHALO800 |
| `/admin/search?q=` | Quick search over members, corporations and jobs | BHALO800 |
| `/admin/jobs`, `/admin/jobs/new`, `/admin/jobs/[id]` | Job postings; the edit page also holds the 求人票 | BHALO801, 802, 117 |
| `/admin/companies`, `…/new`, `…/[id]` | Companies and their job list | BHALO803, 804, 115 |
| `/admin/members`, `…/new`, `…/[id]` | Individual members: profile, résumé fields, and every child table (languages, education, work, certifications, areas, job/study wishes, family) | BHALO805, 806, 010–026, 201, 202 |
| `/admin/schools`, `…/new`, `…/[id]` | Schools and their recruitment list | BHALO807, 808, 155 |
| `/admin/recruitments`, `…/new`, `…/[id]` | Student recruitments | BHALO809, 156 |
| `/admin/applications`, `…/[id]` | Contact requests from My Page, with a status and staff memo | BHALO200 (not in the admin spec) |
| `/admin/users`, `…/new`, `…/[id]` | Staff accounts and permissions | BHALO810, 811 |
| `/admin/masters/options` | 選択項目マスタ: dropdown values, two levels | BHALO812 |
| `/admin/masters/logins` | Every login (members and staff): activate, deactivate, delete | BHALO813 |
| `/admin/masters/numbering` | Member-number sequences and row counts | BHALO814 |
| `/admin/masters/industries` | 人気業種 | BHALO815 |
| `/admin/masters/settings` | Where contact requests are emailed | BHALO816 |
| `/admin/reviews` (+ `/admin/reviews/candidates/[id]`) | 審査待ち一覧: approve / reject employer job postings, candidate profiles and applications (any staff with 更新権限); rejections carry a reason the member sees | — (MVP) |

Behaviour shared by the screens, from the specs:

- List screens filter with partial matches; an empty filter means all rows. 50 rows per page.
- [削除] asks 「この○○情報を削除します。よろしいですか？」 first.
- [更新] with empty inputs asks 「未入力項目があります。更新してよろしいですか？」 (MSG0001), then saves.
- New 求人番号 / 募集番号 are the company's highest number + 1. Member numbers come from the database sequences.
- Dropdowns load from `selection_options` (the master maintained on BHALO812), not from code.

## How the code is organised

```
src/app/admin/login/            sign-in page (no session needed)
src/app/admin/(console)/        every console page; layout.tsx is the frame and menu
src/components/admin/           shared pieces: fields, FormShell, DeleteButton, SearchForm, Pagination, Flash
src/components/admin/<module>/  the client form(s) of one module
src/server/auth/                staff sessions, passwords, login/logout actions
src/server/admin/<module>.ts    database reads/writes for one module (server only)
src/server/admin/<module>-actions.ts   "use server" actions the forms post to
src/server/admin/form.ts        zod helpers for form fields, date/time conversions
src/server/admin/audit.ts       writes audit_logs on create / update / delete / login
```

A page is a server component: it renders the header and a `<Suspense>` boundary, and an inner async component calls `requireStaff()`, reads the URL, queries the database and renders. Forms are client components built from `fields.tsx` inside `FormShell`, which posts to a server action; the action validates with zod, writes with Prisma, records an audit row and redirects back with `?saved=1`.

To add a screen, copy the jobs module: `src/server/admin/jobs.ts`, `jobs-actions.ts`, `src/components/admin/jobs/job-form.tsx` and the three pages under `src/app/admin/(console)/jobs/`.

## Sensitive data

- `resumes.passport_no` is encrypted with AES-256-GCM before it is stored. The key is `APP_ENCRYPTION_KEY` in `.env.local` (see `.env.example`). Without it the passport field is disabled. Losing the key loses the stored numbers.
- `resumes.religion` is 要配慮個人情報 (APPI). The member form records when the person consented (`sensitive_consent_at`).
- Every create, update, delete, login, approve and reject by staff is written to `audit_logs` with the staff user's id.
- Files candidates upload (résumé, photo) are opened by staff at `/admin/files/<id>`; members use `/api/files/<id>`, which only serves a file to its owner or to an employer whose job the candidate was approved for.

## Not done yet

- Photo, logo and video uploads (needs S3; the fields show 準備中).
- PDF output of 履歴書 (BHALO201) and 求人票 (BHALO117).
- The mobile menu (the sidebar is hidden below 1024px).
- The console is at the guessable path `/admin`; before launch it moves behind a non-obvious path and the WAF.
