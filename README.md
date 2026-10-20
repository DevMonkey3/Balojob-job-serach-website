# Bhalojob（バロジョブ）

A job and school matching site run by ジャパンバングラブリッジ株式会社 (Japan Bangla Bridge). It connects foreign candidates with Japanese employers (技人国・特定技能・技能実習) and schools (大学・専門学校・日本語学校).

The screens follow the design documents in `bhalojob設計書関連` (詳細設計書 BHALO###). Each screen shows its screen ID in small grey text so you can find the matching spec.

## Status

Admin-mediated MVP (2026-10-19): candidates and employers register and log in; the 17-step 履歴書 wizard saves to the database; candidates upload a résumé file and apply to jobs; employers post jobs; staff approve jobs, profiles and applications on `/admin/reviews`; only approved jobs are public and only approved applications reach the employer's page. No payment and no email yet. Schools' registration is hidden (準備中).

Admin console (`/admin`): staff login with permissions, and add / edit / delete screens for every table (jobs, companies, schools, recruitments, members with all profile sections, contact requests, staff users, and the five master screens). See **[docs/admin-console.md](docs/admin-console.md)**. This is the way to put test data into the database today.

## Run locally

Requires Node.js 24+.

First set up the database once: follow **[docs/database-guide.md](docs/database-guide.md)** (PostgreSQL 18, about 10 minutes). Then:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build. On a PC with little free memory, run it as `NEXT_BUILD_CPUS=2 npm run build` (PowerShell: `$env:NEXT_BUILD_CPUS=2; npm run build`) so it uses two workers instead of one per CPU |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run db:migrate` | After editing `prisma/schema.prisma`: write a migration, apply it, regenerate the client |
| `npm run db:deploy` | Apply migrations that haven't run yet (fresh database, server) |
| `npm run db:seed` | Load master data from `db/seed.sql` (once) |
| `npm run db:sample` | Load test rows from `db/sample-data.sql` (local only) |
| `npm run db:studio` | Browse the data in Prisma Studio |

## Screens

| URL | Screen | Spec |
|---|---|---|
| `/` | Top page with member registration | BHALO000 |
| `/login` | Member login + password change | BHALO001 |
| `/register`, `/register/individual`, `/register/corporate` | Create a login | BHALO000, 002, 003 |
| `/profile/[step]` | Individual profile, 17 steps | BHALO010–026 |
| `/corporate/target` | Organisation type | BHALO110 |
| `/corporate/company/[step]` | Company profile + job postings | BHALO111–116 |
| `/corporate/school/[step]` | School profile + student recruitment | BHALO151–156 |
| `/mypage` | Candidate My Page: review status, résumé upload, job search over approved jobs, apply, 応募状況 | BHALO200 |
| `/employer`, `/employer/jobs`, `/employer/jobs/new`, `/employer/jobs/[id]`, `/employer/applicants/[id]` | Employer: company info, jobs (pending until staff approve), approved applicants with their 履歴書 | BHALO111–116 (MVP) |
| `/logout` | Member logout | — |
| `/admin/login` | Staff login (creates the first Administrator on an empty database) | — |
| `/admin` and below | Admin console: dashboard, lists, add/edit screens, masters, and the 審査 queues (`/admin/reviews`) — see docs/admin-console.md | BHALO800–816 |

## Database

PostgreSQL 18 through Prisma 7 (`prisma-client` generator with the `pg` driver adapter). The connection string is `DATABASE_URL` in `.env.local` (copy `.env.example`, which also explains `APP_ENCRYPTION_KEY` for passport numbers).

- `prisma/schema.prisma`: the tables as Prisma models (camelCase in code, snake_case in the database)
- `prisma/migrations/`: SQL migrations. `0_init` is the original hand-written schema, including CHECK rules and triggers that Prisma can't describe; later folders add the staff login tables and so on
- `db/seed.sql`, `db/sample-data.sql`: master data and local test rows
- `src/server/`: all database access (`db.ts` is the client). Only server code may import from it. `server/auth/` holds the staff and member logins, `server/member/` the candidate and employer code, `server/admin/` the console
- `storage/` (git-ignored): uploaded résumés and photos while the local file driver is in use (`src/server/storage.ts`; S3 on AWS)

See **[docs/database-guide.md](docs/database-guide.md)** for setup and for changing tables, [docs/database-tables.md](docs/database-tables.md) for every table and column, and [docs/spreadsheet-review.md](docs/spreadsheet-review.md) for problems found in オブジェクト定義書.

Pages read the database at request time, never during `next build`, so the build doesn't need the database or its password. Public listings are cached for a few minutes (`"use cache"`, tag `listings`).

## Running on a small server (1 vCPU, 1–2 GB)

The site is built to stay quick on a cheap VPS: every page has a static shell (Partial Prerendering) and only the signed-in parts stream from the database; the system font stack means no font downloads; public listings and dropdown labels are cached in memory and refreshed when staff change them (`updateTag`); the connection pool is bounded (`DATABASE_POOL_MAX`, default 5) with a 15-second statement timeout; every list screen has an index.

1. Build once (`NEXT_BUILD_CPUS=2 npm run build`). `next.config.ts` sets `output: "standalone"`, so `.next/standalone` holds a self-contained server. Copy it to the server together with `.next/static` (into `.next/standalone/.next/static`) and `public/`.
2. Run `node server.js` from that folder with `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `APP_ENCRYPTION_KEY` (and `STORAGE_DIR` if uploads should live elsewhere). On a 1 GB box add `NODE_OPTIONS=--max-old-space-size=512`. One process is enough; let systemd restart it (`Restart=always`).
3. Put Caddy or nginx in front for TLS, HTTP/2 and brotli/gzip. `/_next/static/*` is already served with a one-year immutable cache header.
4. PostgreSQL on the same box: `shared_buffers = 256MB`, `work_mem = 8MB`, `max_connections = 20` is plenty — the app never opens more than `DATABASE_POOL_MAX` connections.
5. Back up `storage/` (uploaded résumés) and the database. Moving uploads to S3 is a one-file change in `src/server/storage.ts`.

## Code layout

```
src/
  app/(site)/        public site, registration, wizard, My Page
  app/admin/         admin console (not protected yet)
  components/ui/     shadcn/ui components (Base UI)
  components/wizard/ step engine: field renderer, step screen, draft state
  lib/flows/         step definitions for each wizard (fields, validation, skip rules)
  lib/options.ts     stand-in for 選択項目マスタ (dropdown values); moves to selection_options later
  lib/format.ts      labels for database enums, yen formatting
  app/admin/         admin console (login + (console) route group)
  components/admin/  admin form fields, FormShell, tables, per-module forms
  server/            database client and queries (server only); server/admin/* per module, server/auth/* staff login
  generated/prisma/  Prisma client, generated by `npm install` (not committed)
prisma/              schema.prisma and migrations
db/                  seed and sample data SQL
```

To change a wizard step, edit its entry in `src/lib/flows/`. The screens are generated from those definitions.

## Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4, shadcn/ui on Base UI, lucide icons, PostgreSQL 18 + Prisma 7.
