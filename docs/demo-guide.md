# Demo guide (presenting Bhalojob to a client or manager)

What exists today, how to show it in about 15 minutes, and what to say about the next steps.

## Before the meeting (10 minutes, once)

1. PostgreSQL 18 is installed. Create the `balojob` user and database once (docs/database-guide.md, steps 1–3).
2. In `E:\Bhalojob.com\bhalojob-web`: copy `.env.example` to `.env.local`, set the password and an `APP_ENCRYPTION_KEY`.
3. Load the tables and the demo data:
   ```bash
   npm run db:deploy
   ```
   ```bash
   npm run db:seed
   ```
   ```bash
   npm run db:sample
   ```
4. Start the site:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. The admin console is http://localhost:3000/admin. All demo logins (staff, candidates, employers) are in `DEMO-LOGIN.txt` next to this project (also at the top of `db/sample-data.sql`).
5. Use a window at least 1,024 px wide so the console's side menu is visible. For the candidate and employer parts, use a second browser window or a private window: one browser profile holds one member login at a time (the staff login is separate and can stay open).

The demo data is fictional: 7 companies with 10 job postings, 4 schools with 6 recruitments, 6 candidates from Bangladesh, the Philippines, Myanmar and Vietnam, and 4 contact requests. One job, one candidate profile and two applications start out waiting for staff approval so the queues are not empty.

## The story in one sentence

Nothing reaches the other side without staff approval: an employer's job is public only after staff approve it, a candidate's application reaches the employer only after staff approve it, and the employer then sees the candidate's Japanese 履歴書 on their own page.

## Suggested order

| Minute | Show | Say |
|---|---|---|
| 0–2 | **Top page** `/` | Three visa tracks with live counts of approved postings, popular industries. Everything comes from the database. |
| 2–4 | **Candidate** — log in as the approved candidate (`akram@example.com`) → `/mypage` | Greeting, profile review status, résumé file upload, job search over approved jobs only, 応募する on a job, the 応募状況 list showing 審査中. |
| 4–5 | **Candidate's 履歴書** — プロフィール変更・確認 → `/profile/basic` | The 17-step wizard from the design documents, now saved to the database step by step (change a value, press 次へ, reload: it stays). |
| 5–7 | **Staff** — `/admin` as the Administrator → 審査待ち tiles → `/admin/reviews` | Three queues: jobs, candidate profiles, applications. Open the candidate's 履歴書 from the queue, then approve the application. Show a 差戻し with a reason on the pending profile. |
| 7–9 | **Employer** — log in as `hr@example-kensetsu.co.jp` → `/employer/jobs` → the job with 承認済応募者 1名 | The approved applicant appears under the job: open 履歴書を見る — full Japanese résumé, contact details, the uploaded file. Nothing shows for applications staff have not approved. |
| 9–10 | **Employer posts a job** — 新規求人 → fill a few fields → 審査に出す | Status 審査中 on the employer's list; it is not on the top page yet. |
| 10–11 | **Staff approves the job** — `/admin/reviews?tab=jobs` → 承認 | Reload the top page: the count went up; the job is now in the candidate's search. |
| 11–12 | **Rejected candidate** — log in as `najmul@example.com` | My Page shows 差戻し with the reason staff typed and a 修正して再申請 button. |
| 12–14 | **Admin console tour** (optional) | Members, companies, jobs with the new 審査 column and filter; staff users with permissions; masters. Log in as the view-only user to show permissions. |
| 14–15 | **What's next** | See talking points. |

Quick search in the console header finds members, companies and jobs by number, name or email.

## Talking points

- **What is done:** database (27 tables, every relationship enforced), candidate and employer accounts, the saved 履歴書, résumé upload, applications, the three approval queues, the employer's applicant hand-over, the complete staff console, and an audit trail of every staff action.
- **What is deliberately not in this version:** payment (to be decided), email notifications (status is shown on the pages instead), schools' side of the site, photo/logo display, PDF output of 履歴書 and 求人票, English/Bengali switching, public hosting.
- **Next, in order:** email notifications on approve/reject, PDF 履歴書 for employers, password reset, AWS Tokyo deployment (architecture already designed), then payment once the pricing model is decided.
- **Design-document fixes:** the Excel specs had copy-paste and data-type mistakes (plain-text passwords, a race in member numbering, wrong table references). They are listed with the corrections in `docs/spreadsheet-review.md`; the site implements the corrected behaviour.
- **Privacy (APPI):** passport numbers are encrypted, religion requires recorded consent, employers never see passport/religion/allergies or the login email, uploaded files are served only to the owner, staff, or an employer with an approved applicant.

## If something goes wrong

- A page shows a database error → the dev server isn't reading `.env.local`. Stop it (Ctrl+C) and run `npm run dev` again.
- `npm run db:sample` says "already loaded" → it ran before; nothing to do.
- Forgot a demo password → `DEMO-LOGIN.txt`, or run `npm run db:studio` and look at `users`.
- "This page couldn't load" on a member page right after a code change → reload once; the dev server was recompiling.
